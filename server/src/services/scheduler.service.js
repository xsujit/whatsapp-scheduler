// server/src/services/scheduler.service.js

import schedule from 'node-schedule';
import { CONFIG } from '#config';
import { scheduleDAO } from '#db/schedule.dao';
import { collectionDAO } from '#db/collection.dao';
import { whatsappService } from '#services/whatsapp.service';
import { MESSAGE_STATUS } from '#types/enums';

// Random delay to simulate human behavior
const MIN_DELAY_MS = 30000;
const MAX_DELAY_MS = 40000;

const getRandomDelay = () => Math.floor(Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS + 1) + MIN_DELAY_MS);
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Handles the execution logic for a single scheduled message.
 */
async function executeJob(scheduleItem) {
    const { id, collection_id, content } = scheduleItem;

    console.log(`[Scheduler] Starting Job #${id}`);

    try {
        // 1. Lock the job in DB so other processes/restarts don't pick it up immediately
        await scheduleDAO.updateScheduleStatus(id, MESSAGE_STATUS.IN_PROGRESS);

        const collectionDetails = await collectionDAO.getCollectionDetails(collection_id);

        if (!collectionDetails || !collectionDetails.groups || collectionDetails.groups.length === 0) {
            console.warn(`[Scheduler] Job #${id}: Collection empty or deleted. Marking FAILED.`);
            await scheduleDAO.updateScheduleStatus(id, MESSAGE_STATUS.FAILED);
            return;
        }

        const groupJids = collectionDetails.groups.map(group => group.jid);
        let successCount = 0;
        let failCount = 0;

        // 2. Process Batch
        for (const [index, jid] of groupJids.entries()) {
            try {
                // Check if connection is alive before trying
                const { connected } = whatsappService.getStatus();
                if (!connected) {
                    throw new Error('WhatsApp Client not connected');
                }

                await whatsappService.sendMessage(jid, content);
                successCount++;
                console.log(`[Scheduler] Job #${id}: Sent ${index + 1}/${groupJids.length} to ${jid}`);
            } catch (err) {
                console.error(`[Scheduler] Failed to send to ${jid}:`, err.message);
                failCount++;
            }

            // Wait before next message (unless it's the last one)
            if (index < groupJids.length - 1) {
                const delay = getRandomDelay();
                await wait(delay);
            }
        }

        // 3. Finalize Status
        // If at least one message sent, we consider it SENT (or PARTIAL_SENT if you want to add that enum)
        const finalStatus = successCount > 0 ? MESSAGE_STATUS.SENT : MESSAGE_STATUS.FAILED;
        await scheduleDAO.updateScheduleStatus(id, finalStatus);
        console.log(`[Scheduler] Job #${id} finished. Success: ${successCount}, Failed: ${failCount}`);

    } catch (e) {
        console.error(`[Scheduler] Job #${id} execution fatal error:`, e);
        // If it crashed, mark as FAILED so it doesn't get stuck in IN_PROGRESS forever
        await scheduleDAO.updateScheduleStatus(id, MESSAGE_STATUS.FAILED);
    }
}

export const schedulerService = {

    /**
     * @typedef {object} ScheduleItem
     * @property {number} id - The unique ID of the scheduled message.
     * @property {import('luxon').DateTime} scheduled_at - The Luxon DateTime object
     * @property {string} content - The content of the message.
     */

    /**
     * Schedules a new message to be sent using the node-schedule library.
     * Uses the Schedule ID as the unique key in node-schedule.
     * * @param {ScheduleItem} scheduleItem - The object containing the scheduled message details, 
     * including a Luxon DateTime for the scheduled time.
     */
    async scheduleNewJob(scheduleItem) {
        const { id, scheduled_at } = scheduleItem;
        const jobName = String(id);

        // node-schedule takes native JS Dates. 
        // Luxon .toJSDate() correctly converts the specific Timezone time to the local system time equivalent.
        const targetTime = scheduled_at.toJSDate();
        const now = new Date();

        // 1. Handle Past Jobs immediately (if within reasonable threshold, e.g., 5 mins, run immediately; otherwise expire)
        if (targetTime < now) {
            console.warn(`[Scheduler] Job #${id} target time ${targetTime.toISOString()} is in the past.`);
            await scheduleDAO.updateScheduleStatus(id, MESSAGE_STATUS.EXPIRED);
            return;
        }

        // 2. Schedule using node-schedule
        if (schedule.scheduledJobs[jobName]) {
            schedule.scheduledJobs[jobName].cancel();
        }

        schedule.scheduleJob(jobName, targetTime, () => executeJob(scheduleItem));
        console.log(`[Scheduler] Job #${id} scheduled for ${targetTime.toISOString()}`);
    },

    /**
     * Restores pending jobs on startup.
     */
    async restoreJobs() {
        try {
            // Cancel any in-memory jobs to ensure clean slate
            Object.keys(schedule.scheduledJobs).forEach(jobName => schedule.cancelJob(jobName));

            // 1. Reset any jobs that were stuck "IN_PROGRESS" when server crashed
            // We mark them as PENDING so they get rescheduled.
            // WARNING: This causes duplicate messages for groups already sent before crash. 
            // Without a separate "schedule_log" table, this is the only way to ensure completion.
            await scheduleDAO.resetStuckJobs();

            // 2. Fetch all PENDING jobs
            const pendingSchedules = await scheduleDAO.getPendingSchedules();
            console.log(`[Scheduler] Found ${pendingSchedules.length} pending jobs to restore.`);

            for (const item of pendingSchedules) {
                await this.scheduleNewJob(item);
            }
            console.log(`[Scheduler] Job restoration complete.`);

        } catch (error) {
            console.error('[Scheduler] Failed to restore jobs:', error);
        }
    },

    /**
     * Cancels an existing job by its schedule ID.
     */
    cancelJob(id) {
        const jobName = String(id);
        const currentJob = schedule.scheduledJobs[jobName];

        if (currentJob) {
            currentJob.cancel();
            console.log(`[Scheduler] Job #${id} cancelled from memory.`);
            return true;
        }
        return false;
    },

    /**
     * Returns a list of all currently scheduled job IDs and their next invocation.
     */
    getScheduledJobs() {
        const jobs = [];
        // 'schedule.scheduledJobs' is the internal registry of node-schedule
        for (const [name, job] of Object.entries(schedule.scheduledJobs)) {
            jobs.push({
                id: name,
                nextInvocation: job.nextInvocation()
            });
        }
        return jobs;
    }
};