// server/src/queues/whatsapp.queue.js

import { Queue, Job } from 'bullmq';
import { CONFIG } from '#config';
import { redisConnection } from '#queues/connection';
import { logger } from '#lib/logger';

export const QUEUE_NAME = '{whatsapp-message-queue}';

export const whatsappQueue = new Queue(QUEUE_NAME, {
    connection: redisConnection,
    defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: 1000,
        removeOnFail: 5000,
    },
});

export const queueFacade = {
    /**
     * Adds a single message job.
     * @param {string} uniqueId - Helper ID (e.g. "msg_item_55")
     * @param {object} data - Payload
     * @param {number} delayMs - Delay from NOW
     */
    async addMessageJob(uniqueId, data, delayMs) {
        await whatsappQueue.add('send-message', data, {
            jobId: uniqueId,
            delay: delayMs > 0 ? delayMs : 0,
        });
    },

    /**
     * Removes a specific job from the queue by ID.
     * Used for cancelling pending one-time messages.
     */
    async removeJob(uniqueId) {
        const job = await Job.fromId(whatsappQueue, uniqueId);
        if (job) {
            await job.remove();
            logger.info({ jobId: uniqueId }, '[Queue] Removed pending Job from Queue');
        } else {
            logger.info({ jobId: uniqueId }, '[Queue] Job not found for removal (already processed?)');
        }
    },

    /**
     * UPSERT a Job Scheduler
     * This handles Creating AND Updating recurring rules.
     */
    async upsertRecurringRule(ruleId, cronExpression, data) {
        const schedulerId = `scheduler-rule-${ruleId}`;

        await whatsappQueue.upsertJobScheduler(
            schedulerId,
            {
                pattern: cronExpression,
                tz: CONFIG.TIMEZONE
            },
            {
                name: 'trigger-rule',
                data: { ruleId, ...data },
                opts: {
                    jobId: `trigger-instance-${ruleId}-${Date.now()}`
                }
            }
        );
        logger.info({ schedulerId, cron: cronExpression }, '[Queue] Upserted Job Scheduler');
    },

    /**
     * Remove a Job Scheduler.
     */
    async removeRecurringRule(ruleId) {
        const schedulerId = `scheduler-rule-${ruleId}`;
        await whatsappQueue.removeJobScheduler(schedulerId);
        logger.info({ schedulerId }, '[Queue] Removed Job Scheduler');
    },

    /**
     * Cleans the queue (useful for "Clean Slate" startups or tests)
     */
    async obliterate() {
        await whatsappQueue.obliterate({ force: true });
        logger.warn('[Queue] Obliterated (All jobs removed)');
    }
};