// server/server.js

import path from 'path';
import schedule from 'node-schedule';
import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { DateTime } from 'luxon';
import 'dotenv/config';
import { SCHEDULE_CONFIG } from './config.js';
import makeWASocket, { DisconnectReason, useMultiFileAuthState } from 'baileys';
import qrcode from 'qrcode-terminal';
import { toNodeHandler, fromNodeHeaders } from 'better-auth/node';
import { auth, db } from './auth.js';
import { scheduleRequestSchema } from './lib/validation.js';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { logger } from './lib/logger.js';

// ES MODULE PATH SETUP
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// CONSTANTS
let waSocket = null;
let isClientReady = false;
const MESSAGE_QUEUE = [];
let isProcessingQueue = false;
const SEND_DELAY_MS = 3000;
const SESSION_PATH = path.join(__dirname, 'baileys_session');
const TARGET_TIMEZONE = process.env.APP_TIMEZONE;
const SHOW_JID_NAME_DICTIONARY = process.env.SHOW_JID_NAME_DICTIONARY;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN;
const PORT = parseInt(process.env.PORT);
const SCHEDULE_DAY = parseInt(process.env.SCHEDULE_DAY);

function getTargetTimeForTomorrow(hour, minute, targetTimezone) {
    const today = DateTime.now().setZone(targetTimezone);
    const scheduleDay = today.plus({ days: SCHEDULE_DAY });
    const targetLuxonTime = scheduleDay.set({ hour, minute, second: 0, millisecond: 0 });
    return targetLuxonTime;
}

const app = express();

app.use(cors({
    origin: CLIENT_ORIGIN,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
}));

app.use(express.json());
app.all('/api/auth/*splat', toNodeHandler(auth));

app.get('/health', (req, res) => {
    const uptimeSeconds = process.uptime();
    const uptimeString = new Date(uptimeSeconds * 1000).toISOString().substr(11, 8);

    // 2. Determine WhatsApp Status
    // We check if the socket exists and if we have a user ID (meaning auth is done)
    const isWhatsAppConnected = isClientReady && waSocket?.user?.id;

    // 3. Construct the status object
    const status = {
        status: 'UP',
        timestamp: new Date().toISOString(),
        uptime: uptimeString,
        service: 'WhatsApp Scheduler',
        whatsapp: {
            connected: !!isWhatsAppConnected,
            // Show the generic status or the specific JID if connected (masked for privacy if needed)
            jid: isWhatsAppConnected ? waSocket.user.id : 'disconnected'
        },
        memory: process.memoryUsage().rss / 1024 / 1024 // Memory in MB
    };

    // 4. Return 503 if WhatsApp is down, otherwise 200
    // This allows monitoring tools to alert you if WhatsApp disconnects
    const httpStatus = isWhatsAppConnected ? 200 : 503;

    res.status(httpStatus).json(status);
});

const protectRoute = async (req, res, next) => {
    try {
        const session = await auth.api.getSession({
            headers: fromNodeHeaders(req.headers)
        });
        if (!session) {
            return res.status(401).json({ error: 'Unauthorized: Please sign in.' });
        }
        req.user = session.user;
        next();
    } catch (error) {
        return res.status(500).json({ error: 'Auth check failed' });
    }
};

const scheduleApiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Limit each user to 10 requests per 15 minutes
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    keyGenerator: (req) => {
        if (req.user) {
            return req.user.id;
        }

        return ipKeyGenerator(req);
    },
    message: {
        error: "Too many schedule requests. Please wait 15 minutes before trying again."
    }
});

app.get('/api/config', (req, res) => {
    res.json({
        allowRegistration: process.env.ALLOW_REGISTRATION === 'true'
    });
});

app.get('/api/jobs', protectRoute, async (req, res) => {
    try {
        const jobs = await db.selectFrom('scheduled_messages')
            .selectAll()
            .orderBy('created_at', 'desc')
            .limit(10)
            .execute();

        res.json({ success: true, jobs });
    } catch (error) {
        console.error('[DB ERROR] Failed to fetch jobs:', error);
        res.status(500).json({ error: 'Failed to fetch job history.' });
    }
});

app.post('/api/schedule', protectRoute, scheduleApiLimiter, async (req, res) => {
    if (!isClientReady) {
        return res.status(503).json({
            error: 'WhatsApp client is still initializing. Please wait a moment.'
        });
    }

    // 1. Validate Input with Zod
    const validation = scheduleRequestSchema.safeParse(req.body);

    if (!validation.success) {
        return res.status(400).json({
            error: 'Validation failed',
            details: validation.error.flatten().fieldErrors
        });
    }

    // 2. Extract safe data
    const { message } = validation.data;

    if (!message) {
        return res.status(400).json({ error: 'Message content is required.' });
    }

    const scheduledTimes = [];

    for (const config of SCHEDULE_CONFIG) {
        const { JID, hour, minute } = config;

        // 1. Get the target time as a Luxon object in the correct local timezone
        const scheduleTimeLuxon = getTargetTimeForTomorrow(hour, minute, TARGET_TIMEZONE);

        // 2. Convert to UTC and get the ISO string for database storage
        const isoTime = scheduleTimeLuxon.toUTC().toISO();

        // 3. Convert the Luxon object back to a standard JS Date for node-schedule
        const scheduleTimeJSDate = scheduleTimeLuxon.toJSDate();

        try {
            const result = await db.insertInto('scheduled_messages')
                .values({
                    jid: JID,
                    content: message,
                    scheduled_at: isoTime,
                    status: 'PENDING'
                })
                .returning('id')
                .executeTakeFirst();

            const dbId = result.id;
            const jobName = `Job_${dbId}_${JID}`;

            scheduleJobInMemory(dbId, jobName, scheduleTimeJSDate, JID, message);

            scheduledTimes.push({
                chat: JID,
                time: scheduleTimeLuxon.toFormat('MMM dd, yyyy HH:mm'),
                timezone: TARGET_TIMEZONE
            });

        } catch (err) {
            console.error(`[DB ERROR] Failed to save schedule for ${JID}:`, err);
        }
    }

    const scheduleDayDescription = SCHEDULE_DAY === 0 ? 'today'
        : (SCHEDULE_DAY === 1 ? 'tomorrow' : `in ${SCHEDULE_DAY} days`);

    res.json({
        success: true,
        scheduledFor: scheduledTimes.map(s => ({
            chat: s.chat,
            time: s.time,
            timezone: TARGET_TIMEZONE
        })),
        message: `✅ Message scheduled successfully for ${scheduleDayDescription}!`
    });
});

app.use(express.static(path.resolve('../client/dist')));

app.get('/*splat', (req, res) => {
    res.sendFile(path.resolve('../client/dist/index.html'));
});

async function sendScheduledMessage(targetJid, messageContent) {
    if (!waSocket || waSocket.user?.id === 'default') {
        console.error('[FATAL] WhatsApp client not ready. Message skipped.');
        return false;
    }
    if (!targetJid || !targetJid.includes('@')) {
        console.error(`[ERROR] Invalid JID: '${targetJid}'.`);
        return false;
    }

    try {
        await waSocket.sendMessage(targetJid, { text: messageContent });
        console.log(`[FINAL] Baileys message sent to ${targetJid}.`);
        return true;
    } catch (error) {
        console.error(`[ERROR] Failed to send message to ${targetJid}.`);
        console.error(error);
        return false;
    }
}

async function processMessageQueue() {
    if (isProcessingQueue || MESSAGE_QUEUE.length === 0) {
        return;
    }

    isProcessingQueue = true;

    // Process the queue synchronously
    while (MESSAGE_QUEUE.length > 0) {
        const { dbId, jobName, scheduleDate, jid, message } = MESSAGE_QUEUE.shift();

        console.log(`[QUEUE PROCESSOR] Executing: ${jobName}`);

        // 1. Send the message (this is the original logic moved here)
        const success = await sendScheduledMessage(jid, message);
        const newStatus = success ? 'COMPLETED' : 'FAILED';

        // 2. Update DB status
        try {
            await db.updateTable('scheduled_messages')
                .set({ status: newStatus })
                .where('id', '=', dbId)
                .execute();
            console.log(`[DB] Job ${dbId} marked as ${newStatus}`);
        } catch (dbErr) {
            console.error(`[DB ERROR] Failed to update job status for ID ${dbId}:`, dbErr);
        }

        // 3. Wait before processing the next item to prevent spamming
        if (MESSAGE_QUEUE.length > 0) {
            await new Promise(resolve => setTimeout(resolve, SEND_DELAY_MS));
        }
    }

    isProcessingQueue = false;
    console.log('[QUEUE PROCESSOR] Queue finished.');
}

function scheduleJobInMemory(dbId, jobName, scheduleDate, jid, message) {
    schedule.scheduleJob(jobName, scheduleDate, async function () {
        console.log('\n======================================================');
        console.log(`[JOB START: ${jobName}] Triggered at ${new Date().toLocaleString()}`);

        MESSAGE_QUEUE.push({ dbId, jobName, scheduleDate, jid, message });
        processMessageQueue();

        console.log(`[JOB END: ${jobName}] Message queued.`);
        console.log('======================================================\n');
        this.cancel();
    });
}

/**
 * Restores pending jobs from the database on server startup.
 */
async function restoreScheduledJobs() {
    console.log('[SCHEDULER] Checking database for pending jobs...');

    try {
        const pendingJobs = await db.selectFrom('scheduled_messages')
            .selectAll()
            .where('status', '=', 'PENDING')
            .execute();

        if (pendingJobs.length === 0) {
            console.log('[SCHEDULER] No pending jobs found.');
            return;
        }

        const now = new Date();
        let restoredCount = 0;
        let expiredCount = 0;

        for (const job of pendingJobs) {
            const scheduleDate = new Date(job.scheduled_at);
            const jobName = `Restored_Job_${job.id}`;

            // OPTION B: If time has passed, mark as EXPIRED
            if (scheduleDate < now) {
                await db.updateTable('scheduled_messages')
                    .set({ status: 'EXPIRED' })
                    .where('id', '=', job.id)
                    .execute();
                console.log(`[SCHEDULER] Job ${job.id} missed execution time (${job.scheduled_at}). Marked EXPIRED.`);
                expiredCount++;
                continue;
            }

            // Otherwise, schedule it
            scheduleJobInMemory(job.id, jobName, scheduleDate, job.jid, job.content);
            restoredCount++;
        }

        console.log(`[SCHEDULER] Restoration complete. Restored: ${restoredCount}, Expired: ${expiredCount}`);

    } catch (err) {
        console.error('[SCHEDULER] Failed to restore jobs:', err);
    }
}

async function initializeWhatsAppClient() {
    const { state, saveCreds } = await useMultiFileAuthState(SESSION_PATH);

    waSocket = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        browser: ['Ubuntu', 'Chrome', '120.0.0.0'],
        logger: logger,
    });

    waSocket.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            console.log('\n------------------------------------------------------');
            console.log('[AUTH REQUIRED] Please scan the QR code below:');
            qrcode.generate(qr, { small: true });
            console.log('------------------------------------------------------');
        }

        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect.error)?.output?.statusCode !== DisconnectReason.loggedOut;
            console.error('[STATUS] Connection closed. Attempting to restart...', shouldReconnect);
            if (shouldReconnect) {
                setTimeout(initializeWhatsAppClient, 5_000);
            }
        } else if (connection === 'open') {
            console.log('[STATUS] WhatsApp Client Connected.');
            isClientReady = true;
            if (SHOW_JID_NAME_DICTIONARY === 'true') {
                await printJidNameDictionary(waSocket);
            }
            console.log('[STATUS] Ready to process schedules.');
        }
    });

    waSocket.ev.on('creds.update', saveCreds);
}

// --- SERVER START ---

app.listen(PORT, async () => {
    console.log(`\n================ WhatsApp Scheduler ================`);
    console.log(` Port: ${PORT}`);
    console.log(` Endpoint: http://localhost:${PORT}/api/schedule`);
    console.log(` Timezone: ${TARGET_TIMEZONE}`);
    console.log(`======================================================\n`);

    // 1. Initialize WhatsApp
    initializeWhatsAppClient();

    // 2. Restore Jobs from DB
    await restoreScheduledJobs();

}).on('error', (err) => {
    console.error(`\n[FATAL SERVER STARTUP ERROR]`, err.message);
});

async function printJidNameDictionary(waSocket) {
    console.log('\n======================================================');
    console.log('         WHATSAPP JID/NAME DICTIONARY');
    console.log('======================================================');

    try {
        // Use a supported method to get all chats/groups. 
        // We fetch all groups participating and log their metadata.
        const allMetadata = await waSocket.groupFetchAllParticipating();
        const groups = Object.values(allMetadata);

        if (groups.length === 0) {
            console.log('[WARNING] No group metadata found. Trying alternate fetch...');
        }

        // Output for Groups and Contacts (using a simplified method)
        // Note: For individual contacts, Baileys often requires a store/listener 
        // to populate them fully. Groups are more reliable to fetch directly.

        const outputMap = {};

        // 1. Map Groups
        groups.forEach(group => {
            outputMap[group.subject] = group.id;
        });

        // 2. Add an instruction for individual contacts
        console.log('\n--- GROUPS (Subject and JID) ---');
        Object.entries(outputMap).forEach(([name, jid]) => {
            console.log(`| JID: ${jid} | Name: ${name}`);
        });

        console.log('\n--- INDIVIDUAL CONTACTS (Requires Manual Lookup) ---');
        console.log('Individual contacts follow the format: [CountryCode][Number]@s.whatsapp.net');
        console.log('Example: For contact "+1-555-123-4567", use JID: 15551234567@s.whatsapp.net');

        console.log('\n======================================================');
        console.log(`ACTION: Copy the required JID(s) above into your SCHEDULE_CONFIG file.`);

    } catch (error) {
        console.error('[ERROR] Failed to fetch chat dictionary:', error.message);
    }
}