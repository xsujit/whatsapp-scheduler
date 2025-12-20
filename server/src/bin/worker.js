// server/src/bin/worker.js

/**
 * The Worker process doesn't run inside Express, 
 * so it doesn't have the middleware safety net. 
 * Manually implement Process-Level Error Handling here 
 * to ensure it logs crashes correctly (in JSON) before exiting.
 */

import { CONFIG } from '#config';
import { initializeSchema } from '#db';
import { logger } from '#lib/logger';

// Services
import { whatsappService } from '#services/whatsapp.service';
import { scheduleService } from '#services/schedule.service';
import { scheduleDAO } from '#db/schedule.dao';

// Queues
import { createWorker } from '#queues/whatsapp.worker';
import { whatsappQueue } from '#queues/whatsapp.queue';

// Status Bridge
import { statusBridge } from '#lib/status.bridge';

async function startWorker() {
    try {
        logger.info('[Startup] Initializing Database...');
        await initializeSchema();

        logger.info('[Startup] Initializing WhatsApp Service...');
        await whatsappService.initialize();
        await scheduleService.restoreSchedules();

        logger.info('[Startup] Starting BullMQ Worker...');
        const worker = createWorker({
            whatsappService,
            scheduleService,
            scheduleDAO
        });

        // Heartbeat for status updates
        const heartbeat = setInterval(async () => {
            try {
                const status = whatsappService.getStatus();
                await statusBridge.updateStatus(status);
            } catch (err) {
                logger.error({ err }, 'Failed to update status bridge');
            }
        }, 5000);

        logger.info({
            dropTables: CONFIG.DROP_SCHEDULED_MESSAGES,
            timezone: CONFIG.TIMEZONE,
        }, 'WhatsApp Worker Started');

        // --- Graceful Shutdown ---
        const shutdown = async (signal) => {
            logger.warn({ signal }, 'Shutting down Worker...');
            clearInterval(heartbeat);

            try {
                // 1. Close BullMQ
                logger.info('Closing Worker...');
                await worker.close();
                await whatsappQueue.close();

                // 2. Ideally destroy WhatsApp socket here if supported
                // await whatsappService.destroy(); 

                logger.info('Shutdown complete.');
                process.exit(0);
            } catch (err) {
                logger.error({ err }, 'Error during shutdown');
                process.exit(1);
            }
        };

        process.on('SIGTERM', () => shutdown('SIGTERM'));
        process.on('SIGINT', () => shutdown('SIGINT'));

    } catch (error) {
        logger.fatal({ err: error }, 'Worker startup failed');
        process.exit(1);
    }
}

// --- Global Process Safety Nets ---

// Catch synchronous errors that were not caught by try/catch
process.on('uncaughtException', (err) => {
    logger.fatal({ err }, 'Uncaught Exception! Shutting down...');
    process.exit(1);
});

// Catch asynchronous promises that rejected but weren't caught
process.on('unhandledRejection', (reason) => {
    logger.fatal({ err: reason }, 'Unhandled Rejection! Shutting down...');
    process.exit(1);
});

startWorker();