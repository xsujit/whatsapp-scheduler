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
import { auth } from "./auth.js";

// ES MODULE PATH SETUP
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// CONSTANTS
let waSocket = null;
let isClientReady = false;
const SESSION_PATH = path.join(__dirname, 'baileys_session');
const TARGET_TIMEZONE = process.env.TIMEZONE_AMS;
const PORT = parseInt(process.env.PORT);
const SCHEDULE_DAY = parseInt(process.env.SCHEDULE_DAY);

function getTargetTimeForTomorrow(hour, minute, targetTimezone) {
    const today = DateTime.now().setZone(targetTimezone);
    const scheduleDay = today.plus({ days: SCHEDULE_DAY });
    const targetLuxonTime = scheduleDay.set({ hour, minute, second: 0, millisecond: 0 });
    return targetLuxonTime.toJSDate();
}

// EXPRESS
const app = express();
app.use(cors({
    origin: "http://localhost:5173", // Your React Client URL
    credentials: true, // Allow cookies to be sent
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

        // Attach user to request if you need their ID later
        req.user = session.user;
        next();
    } catch (error) {
        return res.status(500).json({ error: "Auth check failed" });
    }
};

async function sendScheduledMessage(targetJid, messageContent) {
    if (!waSocket || waSocket.user?.id === 'default') {
        console.error('[FATAL] WhatsApp client not ready or authenticated. Message skipped.');
        return false;
    }

    if (!targetJid || !targetJid.includes('@')) {
        console.error(`[ERROR] Invalid JID found in config: "${targetJid}". Message skipped.`);
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

// --- API ENDPOINT IMPLEMENTATION ---

app.post('/api/schedule', protectRoute, (req, res) => {
    if (!isClientReady) {
        return res.status(503).json({
            error: 'WhatsApp client is still initializing or syncing. Please wait a moment and try again.'
        });
    }
    const { message } = req.body;

    if (!message) {
        return res.status(400).json({ error: 'Message content is required.' });
    }

    const scheduledTimes = [];

    // Schedule the jobs based on the configuration array
    SCHEDULE_CONFIG.forEach(({ JID, hour, minute }, index) => {
        const scheduleTime = getTargetTimeForTomorrow(hour, minute);

        const jobName = `Job_${index + 1}_${JID}`;

        const job = schedule.scheduleJob(jobName, scheduleTime, async function () {
            console.log('\n======================================================');
            console.log(`[JOB START: ${jobName}] Scheduled task triggered at ${new Date().toLocaleString()}`);
            await sendScheduledMessage(JID, message);
            console.log(`[JOB END: ${jobName}] Scheduled task finished.`);
            console.log('======================================================\n');
            job.cancel();
        });

        scheduledTimes.push({
            chat: JID,
            time: scheduleTime.toLocaleString('en-GB', { timeZone: TARGET_TIMEZONE })
        });
    });

    const scheduleDayDescription = SCHEDULE_DAY === 0 ? "today"
        : (SCHEDULE_DAY === 1 ? "tomorrow" : `in ${SCHEDULE_DAY} days`);

    console.log(`[SCHEDULER] Successfully scheduled message for ${scheduleDayDescription} in ${TARGET_TIMEZONE}`);

    res.json({
        success: true,
        scheduledFor: scheduledTimes.map(s => ({
            chat: s.JID,
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
            console.log('[STATUS] WhatsApp Client Connected and Ready.');
            await printJidNameDictionary(waSocket);
            isClientReady = true;
            console.log('[STATUS] Scheduler is fully initialized and ready to receive requests.');
        }
    });

    waSocket.ev.on('creds.update', saveCreds);
}

// --- SERVER START ---

app.listen(PORT, () => {
    console.log(`\n================ WhatsApp Scheduler ================`);
    console.log(` Port: ${PORT}`);
    console.log(` Endpoint: http://localhost:${PORT}/api/schedule`);
    console.log(` Timezone: ${TARGET_TIMEZONE}`);
    console.log(`======================================================\n`);

    initializeWhatsAppClient();

}).on('error', (err) => {
    console.error(`\n[FATAL SERVER STARTUP ERROR] Could not start server on port ${PORT}.`);
    console.error(`Error details: ${err.message}`);
    if (err.code === 'EADDRINUSE') {
        console.error('Action required: The port 3001 is already in use. Please stop the other application or change the PORT constant.');
    } else {
        console.error('Action required: Investigate the console error for more details.');
    }
});

/**
 * Fetches all known chats (contacts and groups) and prints their JID and name
 * to the console. This should be used ONCE to update the config file.
 * @param {import('baileys').WASocket} waSocket - The active Baileys socket instance.
 */
async function printJidNameDictionary(waSocket) {
    console.log('\n======================================================');
    console.log('         🔑 WHATSAPP JID/NAME DICTIONARY 🔑');
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