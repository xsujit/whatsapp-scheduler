// server/src/queues/whatsapp.worker.js

import { Worker } from 'bullmq';
import { redisConnection } from '#queues/connection';
import { MESSAGE_STATUS } from '#types/enums';
import { QUEUE_NAME } from '#queues/whatsapp.queue';
import { DateTime } from 'luxon';
import { CONFIG } from '#config';
import { logger } from '#lib/logger';

/**
 * Factory Function to create the worker.
 * Allows injecting dependencies to avoid circular imports.
 */
export const createWorker = ({ whatsappService, scheduleService, scheduleDAO }) => {

    const worker = new Worker(QUEUE_NAME, async (job) => {
        const { name, data } = job;

        // Child logger for trace-ability
        const jobLogger = logger.child({ jobId: job.id, jobName: name });

        // --- 1. SEND MESSAGE JOB ---
        if (name === 'send-message') {
            const { itemId, groupJid, content, scheduleId } = data;
            jobLogger.info({ itemId, scheduleId }, '[Worker] Processing Send Message');

            const currentItem = await scheduleDAO.getItemById(itemId);

            if (currentItem.status === MESSAGE_STATUS.SENT) {
                jobLogger.info({ itemId }, '[Worker] Skipping item - Already SENT');
                return;
            }

            try {
                const { connected } = whatsappService.getStatus();
                if (!connected) throw new Error('WhatsApp Disconnected');

                await whatsappService.sendMessage(groupJid, content);
                await scheduleDAO.updateItemStatus(itemId, MESSAGE_STATUS.SENT);

                jobLogger.info({ itemId }, '[Worker] Message sent successfully');

            } catch (err) {
                jobLogger.error({ err, itemId }, '[Worker] Send message failed');

                await scheduleDAO.updateItemStatus(itemId, MESSAGE_STATUS.FAILED, err.message);

                // Trigger BullMQ retry
                throw err;
            }
        }

        // --- 2. TRIGGER RECURRING RULE ---
        else if (name === 'trigger-rule') {
            const { ruleId } = data;
            jobLogger.info({ ruleId }, '[Worker] Triggering Recurring Rule');

            const definitions = await scheduleDAO.getDefinitions();
            const rule = definitions.find(d => d.id === ruleId);

            if (rule && rule.is_active) {
                const now = DateTime.now().setZone(CONFIG.TIMEZONE);
                await scheduleService.createSchedule(
                    rule.user_id,
                    {
                        collectionId: rule.collection_id,
                        content: rule.content,
                        hour: rule.hour,
                        minute: rule.minute
                    },
                    {
                        forcedTime: now,
                        definitionId: rule.id
                    }
                );
            } else {
                jobLogger.warn({ ruleId }, '[Worker] Rule triggered but inactive/deleted');
            }
        }
    }, {
        connection: redisConnection,
        concurrency: 1, // STRICT SEQUENTIAL EXECUTION
        limiter: {
            max: 1, // Max 1 job
            duration: 1000 // Per 1 second (Hardware rate limit safeguard)
        }
    });

    // Standardized Worker Event Logging

    worker.on('active', (job, prev) => {
        logger.debug({ jobId: job.id, name: job.name, prev }, '[Worker] Job Active');
    });

    worker.on('completed', (job) => {
        logger.debug({ jobId: job.id, name: job.name }, '[Worker] Job Completed');
    });

    worker.on('error', (err) => {
        // This is a specific worker connection error, not a job error
        logger.error({ err }, '[Worker] Connection Error');
    });

    worker.on('failed', (job, err) => {
        logger.error({
            err,
            jobId: job?.id,
            jobName: job?.name,
            jobData: job?.data
        }, '[Worker] Job Failed');
    });

    return worker;
};