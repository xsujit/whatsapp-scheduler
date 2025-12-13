// server/src/bin/worker.js

import { CONFIG } from '#config';
import { initializeSchema } from '#db';

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
        console.log('[Startup] Initializing Database...');
        await initializeSchema();

        console.log('[Startup] Initializing WhatsApp Service...');
        await whatsappService.initialize();
        await scheduleService.restoreSchedules();

        console.log('[Startup] Starting BullMQ Worker...');
        const worker = createWorker({
            whatsappService,
            scheduleService,
            scheduleDAO
        });

        const heartbeat = setInterval(async () => {
            const status = whatsappService.getStatus();
            await statusBridge.updateStatus(status);
        }, 5000); // Update every 5 seconds

        console.log(`\n================ WhatsApp Worker Started ================`);
        console.log(` Drop Tables: ${CONFIG.DROP_SCHEDULED_MESSAGES}`);
        console.log(` Timezone: ${CONFIG.TIMEZONE}`);
        console.log(`=========================================================\n`);

        // --- Graceful Shutdown ---
        const shutdown = async (signal) => {
            console.log(`\n[${signal}] Shutting down Worker...`);
            clearInterval(heartbeat);

            // 1. Close BullMQ
            console.log('[Queue] Closing Worker...');
            await worker.close();
            await whatsappQueue.close();

            // 2. Ideally destroy WhatsApp socket here if supported
            // await whatsappService.destroy(); 

            console.log('[Shutdown] Complete.');
            process.exit(0);
        };

        process.on('SIGTERM', () => shutdown('SIGTERM'));
        process.on('SIGINT', () => shutdown('SIGINT'));

    } catch (error) {
        console.error('[FATAL] Worker startup failed:', error);
        process.exit(1);
    }
}

startWorker();