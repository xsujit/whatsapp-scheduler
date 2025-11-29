import { chromium } from 'playwright';
import path from 'path';
import schedule from 'node-schedule';
import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { DateTime } from 'luxon';
import 'dotenv/config';
import { SCHEDULE_CONFIG } from './config.js';

// ES MODULE PATH SETUP
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// CONSTANTS
const TARGET_TIMEZONE = process.env.TIMEZONE_AMS;
const PORT = parseInt(process.env.PORT);
const TIMEOUT_MS = parseInt(process.env.TIMEOUT_MS);
const SCHEDULE_DAY = parseInt(process.env.SCHEDULE_DAY);
const HEADLESS_MODE = process.env.HEADLESS_MODE === 'true';

// EXPRESS
const app = express();
app.use(cors());
app.use(express.json());

/**
 * Core function to find a chat, open it, and send a message.
 * @param {import('playwright').Page} page - The Playwright Page object.
 * @param {string} targetChatName - The name of the group or contact to message.
 * @param {string} messageContent - The message text to send.
 * @returns {Promise<boolean>} - True if the message was successfully sent.
 */
async function scheduleWhatsAppMessage(page, targetChatName, messageContent) {
    console.log(`[TASK] Starting message automation for: "${targetChatName}"`);

    // Locate and Open the Target Chat
    const timeoutMs = TIMEOUT_MS;
    const searchInput = page.locator('[aria-placeholder="Search or start a new chat"]');

    try {
        await searchInput.fill(targetChatName, { timeout: timeoutMs });
        await page.waitForTimeout(2_000);
        console.log(`[STEP 1/3] Successfully searched for: "${targetChatName}"`);

        const chatResult = page.locator(`span[title="${targetChatName}"]`).first();
        await chatResult.waitFor({ state: 'visible', timeout: timeoutMs });
        await chatResult.click({ timeout: timeoutMs });
        await page.waitForTimeout(2_000);
        console.log(`[STEP 2/3] Chat "${targetChatName}" opened successfully.`);

        const messageInput = page.locator('[aria-placeholder="Type a message"]').last();
        await messageInput.waitFor({ state: 'visible', timeout: timeoutMs });
        await messageInput.fill(messageContent);
        await page.waitForTimeout(2_000);
        console.log(`[STEP 3/3] Typed message content.`);

        const sendButton = page.getByRole('button', { name: 'Send' });
        await sendButton.waitFor({ state: 'visible', timeout: timeoutMs });
        await sendButton.click({ timeout: timeoutMs });
        console.log(`[FINAL] Message sent successfully! Content: "${messageContent.substring(0, 50)}..."`);
        return true;

    } catch (error) {
        console.error(`[FATAL ERROR] An error occurred during message automation for "${targetChatName}": ${error.message}`);
        return false;
    }
}

/**
 * Launches the browser and runs the core scheduling function.
 * @param {string} targetChatName - The name of the group or contact to message.
 * @param {string} messageContent - The message text to send.
 */
async function runScheduler(targetChatName, messageContent) {
    const SESSION_PATH = path.join(__dirname, 'playwright_session');
    console.log(`[INIT] Starting Playwright... Session path: ${SESSION_PATH}`);

    let browser;
    const useragent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    try {
        browser = await chromium.launchPersistentContext(SESSION_PATH, {
            headless: HEADLESS_MODE,
            viewport: { width: 1920, height: 1080 },
            slowMo: 50,
            userAgent: useragent,
        });

        const page = browser.pages().length > 0 ? browser.pages()[0] : await browser.newPage();

        await page.goto('https://web.whatsapp.com/');
        console.log(`[NAVIGATE] Navigated to https://web.whatsapp.com/`);

        // --- AUTHENTICATION CHECK ---
        const searchLocator = page.locator('[aria-placeholder="Search or start a new chat"]');
        const qrCodeLocator = page.locator('canvas[aria-label="QR code"]');

        try {
            await searchLocator.waitFor({ state: 'visible', timeout: 90000 });
            console.log('[STATUS] WhatsApp Web loaded and authenticated.');

        } catch (initialLoadError) {
            const isLoggedOut = await qrCodeLocator.isVisible({ timeout: 10000 });

            if (isLoggedOut) {
                console.error('------------------------------------------------------');
                console.error('[AUTH ERROR] WhatsApp is requiring re-authentication (QR code visible).');
                console.error('[AUTH ERROR] Action Required: Set HEADLESS_MODE = false, run the script, scan the QR code, then switch back to true.');
                console.error('------------------------------------------------------');
                throw new Error('Authentication failure: Cannot proceed in headless mode without a valid session.');
            }
            throw initialLoadError;
        }
        // --- END AUTHENTICATION CHECK ---

        // Execute the core automation function
        const success = await scheduleWhatsAppMessage(page, targetChatName, messageContent);

        if (success) {
            console.log('[CLEANUP] Scheduled message sent. Waiting 5 seconds before closing...');
            await page.waitForTimeout(5000);
        } else {
            console.log('[CLEANUP] Task failed. Closing browser.');
        }

    } catch (error) {
        console.error(`[FATAL ERROR] An error occurred during Playwright execution: ${error.message}`);
    } finally {
        if (browser) {
            await browser.close();
            console.log('[CLEANUP] Browser closed.');
        }
    }
}

function getTargetTimeForTomorrow(hour, minute, targetTimezone) {
    const today = DateTime.now().setZone(targetTimezone);
    const scheduleDay = today.plus({ days: SCHEDULE_DAY });
    const targetLuxonTime = scheduleDay.set({ hour, minute, second: 0, millisecond: 0 });
    const scheduleTime = targetLuxonTime.toJSDate();
    return scheduleTime;
}

// --- API ENDPOINT IMPLEMENTATION ---

app.post('/api/schedule', (req, res) => {
    const { message } = req.body;

    if (!message) {
        return res.status(400).json({ error: 'Message content is required.' });
    }

    const scheduledTimes = [];

    // Schedule the jobs based on the configuration array
    SCHEDULE_CONFIG.forEach(({ chatName, hour, minute }, index) => {
        const scheduleTime = getTargetTimeForTomorrow(hour, minute);

        const jobName = `Job_${index + 1}_${chatName.replace(/\s/g, '')}`;

        const job = schedule.scheduleJob(jobName, scheduleTime, async function () {
            console.log('\n======================================================');
            console.log(`[JOB START: ${jobName}] Scheduled task triggered at ${new Date().toLocaleString()}`);
            await runScheduler(chatName, message);
            console.log(`[JOB END: ${jobName}] Scheduled task finished.`);
            console.log('======================================================\n');
            job.cancel();
        });

        scheduledTimes.push({
            chatName: chatName,
            time: scheduleTime.toLocaleString('en-GB', { timeZone: TARGET_TIMEZONE })
        });
    });

    const scheduleDayDescription = SCHEDULE_DAY === 0 ? "today"
        : (SCHEDULE_DAY === 1 ? "tomorrow" : `in ${SCHEDULE_DAY} days`);

    console.log(`[SCHEDULER] Successfully scheduled message for ${scheduleDayDescription} in ${TARGET_TIMEZONE}`);

    res.json({
        success: true,
        scheduledFor: scheduledTimes.map(s => ({
            chat: s.chatName,
            time: s.time,
            timezone: TARGET_TIMEZONE
        })),
        message: `✅ Message scheduled successfully for ${scheduleDayDescription}!`
    });
});

// --- SERVER START ---

app.listen(PORT, () => {
    console.log(`\n================ WhatsApp Scheduler ================`);
    console.log(` Port: ${PORT}`);
    console.log(` Endpoint: http://localhost:${PORT}/api/schedule`);
    console.log(` Timezone: ${TARGET_TIMEZONE}`);
    console.log(`======================================================\n`);
}).on('error', (err) => {
    console.error(`\n[FATAL SERVER STARTUP ERROR] Could not start server on port ${PORT}.`);
    console.error(`Error details: ${err.message}`);
    if (err.code === 'EADDRINUSE') {
        console.error('Action required: The port 3001 is already in use. Please stop the other application or change the PORT constant.');
    } else {
        console.error('Action required: Investigate the console error for more details.');
    }
});