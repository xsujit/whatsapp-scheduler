// server/src/services/scheduler.service.js

import schedule from 'node-schedule';
import { scheduleDAO } from '#db/schedule.dao';
import { whatsappService } from '#services/whatsapp.service';
import { MESSAGE_STATUS } from '#types/enums';

// TODO: FIX Circular dependency (Use dependency injection or direct import)
import { scheduleService } from './schedule.service.js';


const MIN_DELAY_MS = 10000;
const MAX_DELAY_MS = 20000;
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
                if (!connected) throw new Error('WhatsApp Client disconnected');

                await whatsappService.sendMessage(group_jid, content);
                await scheduleDAO.updateItemStatus(itemId, MESSAGE_STATUS.SENT);
            } catch (err) {
                console.error(`[Scheduler] Failed item ${itemId}:`, err.message);
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

    // --- ONE TIME JOBS ---
    async scheduleOneTimeJob(scheduleData) {
        const { id, scheduled_at, content } = scheduleData;
        const jobName = `ONCE_${id}`;
        const targetTime = scheduled_at.toJSDate();

        if (targetTime < new Date()) {
            this.triggerImmediateExecution({ id, content });
            return;
        }

        schedule.scheduleJob(jobName, targetTime, () => executeJob({ id, content }));
        console.log(`[Scheduler] One-Time Job #${id} set for ${targetTime.toISOString()}`);
    },

    // --- RECURRING RULES ---
    async scheduleRecurringRule(definition) {
        const { id, hour, minute } = definition;
        const jobName = `RULE_${id}`;

        // Create Cron-like Rule
        const rule = new schedule.RecurrenceRule();
        rule.hour = hour;
        rule.minute = minute;

        // Ensure we cancel existing if updating
        if (schedule.scheduledJobs[jobName]) schedule.scheduledJobs[jobName].cancel();

        schedule.scheduleJob(jobName, rule, () => {
            console.log(`[Scheduler] Rule #${id} triggered.`);
            // Call Service to generate the child instance
            scheduleService.instantiateRecurringJob(definition);
        });

        console.log(`[Scheduler] Rule #${id} scheduled for Daily @ ${hour}:${minute}`);
    },

    async triggerImmediateExecution(scheduleData) {
        executeJob(scheduleData);
    },

    // --- RESTORATION ---
    async restoreJobs() {
        // 1. Restore Pending One-Time Jobs
        const activeSchedules = await scheduleDAO.getSchedulesWithPendingItems();
        for (const item of activeSchedules) {
            await this.scheduleOneTimeJob(item);
        }

        // 2. Restore Recurring Rules
        const definitions = await scheduleDAO.getDefinitions();
        for (const def of definitions) {
            if (def.is_active) await this.scheduleRecurringRule(def);
        }

        console.log(`[Scheduler] Restored ${activeSchedules.length} One-Time & ${definitions.length} Recurring jobs.`);
    },

    cancelJob(id) {
        // TODO: This needs to differentiate between ONCE and RULE. 
        // Ideally pass type or try cancelling both.
        if (schedule.scheduledJobs[`ONCE_${id}`]) {
            schedule.scheduledJobs[`ONCE_${id}`].cancel();
        }

        if (schedule.scheduledJobs[`RULE_${id}`]) {
            schedule.scheduledJobs[`RULE_${id}`].cancel();
        }
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