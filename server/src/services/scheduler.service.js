// server/src/services/scheduler.service.js

import schedule from 'node-schedule';
import { DateTime } from 'luxon';

export const schedulerService = {
    /**
     * Schedules a One-Time execution.
     * @param {string|number} id - Unique identifier for the job
     * @param {DateTime} targetDateTime - Luxon DateTime object for execution
     * @param {Function} onTick - The callback function to execute
     */
    async scheduleOneTimeJob(id, targetDateTime, onTick) {
        // Ensure you have a Luxon object (especially important for restore logic)
        // const target = targetDateTime instanceof DateTime ? targetDateTime : DateTime.fromJSDate(targetDateTime);
        const target = targetDateTime;

        // Get the current time in UTC (or application timezone) for comparison
        const now = DateTime.now().setZone(target.zoneName); // Compare using the same timezone

        const jobName = `ONCE_${id}`;

        // Safety: Check using Luxon comparison
        if (target <= now) {
            console.log(`[Scheduler] Target time for Job #${id} is past. Executing immediately.`);
            await onTick();
            return;
        }

        // Convert to native Date *only* for node-schedule
        const targetTimeNative = target.toJSDate();

        // Schedule the job
        schedule.scheduleJob(jobName, targetTimeNative, async () => {
            console.log(`[Scheduler] Triggering One-Time Job #${id}`);
            try {
                await onTick();
            } catch (err) {
                console.error(`[Scheduler] Error inside One-Time Job #${id}:`, err);
            }
        });

        console.log(`[Scheduler] One-Time Job #${id} set for ${target.toISO()}`);
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

        console.log(`[Scheduler] Rule #${id} scheduled for Daily @ ${hour}:${minute}`);
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