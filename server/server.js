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
import { toNodeHandler, fromNodeHeaders } from "better-auth/node";
import { auth, db } from "./auth.js"; // Import 'db' here

// ES MODULE PATH SETUP
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// CONSTANTS
let waSocket = null;
let isClientReady = false;
const SESSION_PATH = path.join(__dirname, 'baileys_session');
const TARGET_TIMEZONE = process.env.TIMEZONE_AMS || 'Europe/Amsterdam';
const PORT = parseInt(process.env.PORT) || 3001;
const SCHEDULE_DAY = parseInt(process.env.SCHEDULE_DAY) || 1;

function getTargetTimeForTomorrow(hour, minute, targetTimezone) {
    const today = DateTime.now().setZone(targetTimezone);
    const scheduleDay = today.plus({ days: SCHEDULE_DAY });
    const targetLuxonTime = scheduleDay.set({ hour, minute, second: 0, millisecond: 0 });
    return targetLuxonTime.toJSDate();
}

// EXPRESS
const app = express();
app.use(cors({
    origin: "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
}));
app.use(express.json());
app.all("/api/auth/*splat", toNodeHandler(auth));

const protectRoute = async (req, res, next) => {
    try {
        const session = await auth.api.getSession({
            headers: fromNodeHeaders(req.headers)
        });
        if (!session) {
            return res.status(401).json({ error: "Unauthorized: Please sign in." });
        }
        req.user = session.user;
        next();
    } catch (error) {
        return res.status(500).json({ error: "Auth check failed" });
    }
};

async function sendScheduledMessage(targetJid, messageContent) {
    if (!waSocket || waSocket.user?.id === 'default') {
        console.error('[FATAL] WhatsApp client not ready. Message skipped.');
        return false;
    }
    if (!targetJid || !targetJid.includes('@')) {
        console.error(`[ERROR] Invalid JID: "${targetJid}".`);
        return false;
    }

    try {
        await waSocket.sendMessage(targetJid, { text: messageContent });
        console.log(`[FINAL] Baileys message sent to ${targetJid}.`);
        return true;
    } catch (error) {
        console.error(`[ERROR] Failed to send message to ${targetJid}:`, error.message);
        return false;
    }
}

// --- DATABASE & SCHEDULER HELPERS ---

/**
 * Creates the in-memory job for a database entry.
 * Use this when creating new jobs OR restoring old ones.
 */
function scheduleJobInMemory(dbId, jobName, scheduleDate, jid, message) {
    schedule.scheduleJob(jobName, scheduleDate, async function () {
        console.log('\n======================================================');
        console.log(`[JOB START: ${jobName}] Triggered at ${new Date().toLocaleString()}`);
        
        const success = await sendScheduledMessage(jid, message);
        
        const newStatus = success ? 'COMPLETED' : 'FAILED';
        
        // Update DB status
        try {
            await db.updateTable('scheduled_messages')
                .set({ status: newStatus })
                .where('id', '=', dbId)
                .execute();
            console.log(`[DB] Job ${dbId} marked as ${newStatus}`);
        } catch (dbErr) {
            console.error(`[DB ERROR] Failed to update job status for ID ${dbId}:`, dbErr);
        }

        console.log(`[JOB END: ${jobName}] Finished.`);
        console.log('======================================================\n');
        this.cancel(); // Cancel the node-schedule job to free memory
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

// --- API ENDPOINT IMPLEMENTATION ---

app.post('/api/schedule', protectRoute, async (req, res) => {
    if (!isClientReady) {
        return res.status(503).json({
            error: 'WhatsApp client is still initializing. Please wait a moment.'
        });
    }
    const { message } = req.body;

    if (!message) {
        return res.status(400).json({ error: 'Message content is required.' });
    }

    const scheduledTimes = [];

    // Loop through config and schedule
    for (const [index, config] of SCHEDULE_CONFIG.entries()) {
        const { JID, hour, minute } = config;
        const scheduleTime = getTargetTimeForTomorrow(hour, minute, TARGET_TIMEZONE);
        const isoTime = scheduleTime.toISOString();

        try {
            // 1. Insert into Database FIRST (Source of Truth)
            const result = await db.insertInto('scheduled_messages')
                .values({
                    jid: JID,
                    content: message,
                    scheduled_at: isoTime,
                    status: 'PENDING'
                })
                .returning('id') // Get the ID back
                .executeTakeFirst();

            const dbId = result.id;
            const jobName = `Job_${dbId}_${JID}`;

            // 2. Schedule in Memory
            scheduleJobInMemory(dbId, jobName, scheduleTime, JID, message);

            scheduledTimes.push({
                chat: JID,
                time: scheduleTime.toLocaleString('en-GB', { timeZone: TARGET_TIMEZONE })
            });

        } catch (err) {
            console.error(`[DB ERROR] Failed to save schedule for ${JID}:`, err);
            // If DB fails, we probably shouldn't schedule in memory to avoid "phantom" jobs
        }
    }

    const scheduleDayDescription = SCHEDULE_DAY === 0 ? "today"
        : (SCHEDULE_DAY === 1 ? "tomorrow" : `in ${SCHEDULE_DAY} days`);

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

async function initializeWhatsAppClient() {
    const { state, saveCreds } = await useMultiFileAuthState(SESSION_PATH);

    waSocket = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        browser: ['Ubuntu', 'Chrome', '120.0.0.0'],
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