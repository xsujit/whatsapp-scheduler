// server/src/services/scheduler.service.js

import schedule from 'node-schedule';
import { scheduleDAO } from '#db/schedule.dao';
import { whatsappService } from '#services/whatsapp.service';
import { MESSAGE_STATUS } from '#types/enums';

const MIN_DELAY_MS = 30000;
const MAX_DELAY_MS = 40000;

const getRandomDelay = () => Math.floor(Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS + 1) + MIN_DELAY_MS);
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function executeJob(scheduleItem) {
    const { id, content } = scheduleItem;
    console.log(`[Scheduler] Starting Execution for Job #${id}`);

    try {
        const pendingItems = await scheduleDAO.getPendingItems(id);

        if (pendingItems.length === 0) {
            console.log(`[Scheduler] Job #${id} has no pending items.`);
            return;
        }

        console.log(`[Scheduler] Job #${id} processing ${pendingItems.length} items.`);

        for (const [index, item] of pendingItems.entries()) {
            const { id: itemId, group_jid } = item;

            try {
                const { connected } = whatsappService.getStatus();
                if (!connected) throw new Error('WhatsApp Client not connected');

                await whatsappService.sendMessage(group_jid, content);
                await scheduleDAO.updateItemStatus(itemId, MESSAGE_STATUS.SENT);
                console.log(`[Scheduler] Job #${id}: Sent item ${itemId} to ${group_jid}`);
            } catch (err) {
                console.error(`[Scheduler] Failed item ${itemId} (${group_jid}):`, err.message);
                await scheduleDAO.updateItemStatus(itemId, MESSAGE_STATUS.FAILED, err.message);
            }

            if (index < pendingItems.length - 1) {
                await wait(getRandomDelay());
            }
        }
        console.log(`[Scheduler] Job #${id} execution finished.`);
    } catch (e) {
        console.error(`[Scheduler] Job #${id} fatal error:`, e);
    }
}

export const schedulerService = {

    /**
     * Schedules a job in memory. 
     * @param {object} scheduleData - Expects { id, scheduled_at (Luxon), content }
     */
    async scheduleNewJob(scheduleData) {
        const { id, scheduled_at, content } = scheduleData;
        const jobName = String(id);

        // We trust scheduled_at is a Luxon object.
        const targetTime = scheduled_at.toJSDate();
        const now = new Date();

        if (targetTime < now) {
            console.warn(`[Scheduler] Job #${id} is in the past. Attempting immediate execution...`);
            executeJob({ id, content });
            return;
        }

        if (schedule.scheduledJobs[jobName]) {
            schedule.scheduledJobs[jobName].cancel();
        }

        schedule.scheduleJob(jobName, targetTime, () => executeJob({ id, content }));
        console.log(`[Scheduler] Job #${id} scheduled for ${targetTime.toISOString()}`);
    },

    async restoreJobs() {
        try {
            Object.keys(schedule.scheduledJobs).forEach(jobName => schedule.cancelJob(jobName));

            const activeSchedules = await scheduleDAO.getSchedulesWithPendingItems();
            console.log(`[Scheduler] Found ${activeSchedules.length} schedules with pending items.`);

            for (const item of activeSchedules) {
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
        for (const [name, job] of Object.entries(schedule.scheduledJobs)) {
            jobs.push({
                id: name,
                nextInvocation: job.nextInvocation()
            });
        }
        return jobs;
    }
};