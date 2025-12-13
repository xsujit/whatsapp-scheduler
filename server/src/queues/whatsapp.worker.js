// server/src/queues/whatsapp.worker.js

import { Worker } from 'bullmq';
import { redisConnection } from '#queues/connection';
import { MESSAGE_STATUS } from '#types/enums';
import { QUEUE_NAME } from '#queues/whatsapp.queue';
import { DateTime } from 'luxon';
import { CONFIG } from '#config';

/**
 * Factory Function to create the worker.
 * Allows injecting dependencies to avoid circular imports.
 */
export const createWorker = ({ whatsappService, scheduleService, scheduleDAO }) => {

    const worker = new Worker(QUEUE_NAME, async (job) => {
        const { name, data } = job;

        // --- 1. SEND MESSAGE JOB ---
        if (name === 'send-message') {
            const { itemId, groupJid, content, scheduleId } = data;

            console.log(`[Worker] Processing Item #${itemId} (Job #${scheduleId})`);
            try {
                const { connected } = whatsappService.getStatus();
                if (!connected) throw new Error('WhatsApp Disconnected');

                await whatsappService.sendMessage(groupJid, content);
                await scheduleDAO.updateItemStatus(itemId, MESSAGE_STATUS.SENT);
            } catch (err) {
                console.error(`[Worker] Failed Item #${itemId}:`, err.message);
                await scheduleDAO.updateItemStatus(itemId, MESSAGE_STATUS.FAILED, err.message);
                throw err;
            }
        }

        // --- 2. TRIGGER RECURRING RULE ---
        else if (name === 'trigger-rule') {
            const { ruleId } = data;
            console.log(`[Worker] ⏰ Recurring Rule #${ruleId} Triggered`);

            // Check existence
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
                console.warn(`[Worker] Rule #${ruleId} triggered but is inactive/deleted.`);
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

    worker.on('active', (job, prev) => console.log(`[Worker] Job ${job.id} is active, previous state ${prev}`));

    worker.on('completed', (job) => console.log(`[Worker] Job ${job.id} has completed!`));

    worker.on('error', (reason) => console.log(`[Worker] Error occurred ${reason}`));

    worker.on('failed', (job, err) => console.error(`[Worker] Job ${job.id} Failed: ${err.message}`));

    return worker;
};