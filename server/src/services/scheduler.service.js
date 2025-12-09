// server/src/services/scheduler.service.js

import schedule from 'node-schedule';
import { DateTime } from 'luxon';
import { CONFIG } from '#config';

export const schedulerService = {
    /**
     * Schedules a One-Time execution using a Schedule Domain Object.
     * @param {Object} scheduleObj - The schedule object containing id and scheduled_at (Luxon DateTime)
     * @param {string|number} scheduleObj.id - Unique identifier for the job
     * @param {DateTime} scheduleObj.scheduled_at - Luxon DateTime object for execution
     * @param {Function} onTick - The callback function to execute
     */
    async scheduleOneTimeJob(scheduleObj, onTick) {
        const { id, scheduled_at } = scheduleObj;

        const jobName = `ONCE_${id}`;
        const targetTimeNative = scheduled_at.toJSDate();

        schedule.scheduleJob(jobName, targetTimeNative, async () => {
            console.log(`[Scheduler] Triggering One-Time Job #${id}`);
            try {
                await onTick();
            } catch (err) {
                console.error(`[Scheduler] Error inside One-Time Job #${id}:`, err);
            }
        });

        console.log(`[Scheduler] One-Time Job #${id} set for ${scheduled_at.toISO()}`);
    },

    /**
     * Schedules a Recurring Rule.
     * @param {Object} definition - { id, hour, minute }
     * @param {Function} onTick - The callback function to execute
     */
    async scheduleRecurringRule(definition, onTick) {
        const { id, hour, minute } = definition;
        const jobName = `RULE_${id}`;

        const rule = new schedule.RecurrenceRule();
        rule.hour = hour;
        rule.minute = minute;
        rule.tz = CONFIG.TIMEZONE;

        // Cancel existing rule if we are updating it
        if (schedule.scheduledJobs[jobName]) {
            schedule.scheduledJobs[jobName].cancel();
        }

        schedule.scheduleJob(jobName, rule, async () => {
            console.log(`[Scheduler] Triggering Recurring Rule #${id}`);
            try {
                await onTick();
            } catch (err) {
                console.error(`[Scheduler] Error inside Rule #${id}:`, err);
            }
        });

        console.log(`[Scheduler] Rule #${id} scheduled for Daily @ ${hour}:${minute} (${CONFIG.TIMEZONE})`);
    },

    /**
     * Cancel a job (either one-time or recurring)
     */
    cancelJob(id) {
        const onceName = `ONCE_${id}`;
        const ruleName = `RULE_${id}`;

        if (schedule.scheduledJobs[onceName]) {
            schedule.scheduledJobs[onceName].cancel();
            console.log(`[Scheduler] Cancelled Job ${onceName}`);
        }

        if (schedule.scheduledJobs[ruleName]) {
            schedule.scheduledJobs[ruleName].cancel();
            console.log(`[Scheduler] Cancelled Rule ${ruleName}`);
        }
    },

    /**
     * Diagnostics: Get all active jobs
     */
    getScheduledJobs() {
        return Object.keys(schedule.scheduledJobs).map(key => ({
            id: key,
            nextInvocation: schedule.scheduledJobs[key].nextInvocation()
        }));
    }
};