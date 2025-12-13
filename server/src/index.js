// server/src/index.js

import app from './app.js';
import { CONFIG } from '#config';
import { initializeSchema } from '#db';

// Services (Singletons)
import { whatsappService } from '#services/whatsapp.service';
import { scheduleService } from '#services/schedule.service';
import { scheduleDAO } from '#db/schedule.dao';

// Queues
import { createWorker } from './queues/whatsapp.worker.js';
import { whatsappQueue } from './queues/whatsapp.queue.js';

async function startServer() {
    try {
        console.log('[Startup] Initializing Database...');
        await initializeSchema();

        console.log('[Startup] Initializing Services...');
        await whatsappService.initialize();
        await scheduleService.restoreSchedules();

        // INJECTION - Pass the already-instantiated services into the worker
        const worker = createWorker({
            whatsappService,
            scheduleService,
            scheduleDAO
        });
        console.log('[Startup] Worker Initialized.');

        const server = app.listen(CONFIG.PORT, () => {
            console.log(`\n================ WhatsApp Scheduler ================`);
            console.log(` Port: ${CONFIG.PORT}`);
            console.log(` Timezone: ${CONFIG.TIMEZONE}`);
            console.log(` Registration Open: ${CONFIG.ALLOW_REGISTRATION}`);
            console.log(` Drop Tables (Scheduled Messages): ${CONFIG.DROP_SCHEDULED_MESSAGES}`);
            console.log(` Mode: ${process.env.NODE_ENV}`);
            console.log(`======================================================\n`);
        });

        // --- Graceful Shutdown ---
        const shutdown = async (signal) => {
            console.log(`\n[${signal}] Shutting down gracefully...`);

            // 1. HTTP
            await new Promise(resolve => server.close(resolve));
            console.log('[HTTP] Server closed');

            // 2. Worker
            console.log('[Queue] Closing Worker...');
            await worker.close();
            await whatsappQueue.close();

            // 3. Services
            // await whatsappService.destroy(); // Ideally

            console.log('[Shutdown] Complete.');
            process.exit(0);
        };

        process.on('SIGTERM', () => shutdown('SIGTERM'));
        process.on('SIGINT', () => shutdown('SIGINT'));

    } catch (error) {
        console.error('[FATAL] Server startup failed:', error);
        process.exit(1);
    }
}

startServer();