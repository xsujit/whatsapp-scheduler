// server/src/index.js

import app from './app.js';
import { CONFIG } from '#config';
import { initializeSchema } from '#db';
import { whatsappService } from '#services/whatsapp.service';
import { schedulerService } from '#services/scheduler.service';

async function startServer() {
    try {
        console.log('[Startup] Initializing Database...');
        await initializeSchema();

        console.log('[Startup] Initializing Services...');
        await whatsappService.initialize();
        await schedulerService.restoreJobs();

        app.listen(CONFIG.PORT, () => {
            console.log(`\n================ WhatsApp Scheduler ================`);
            console.log(` Port: ${CONFIG.PORT}`);
            console.log(` Timezone: ${CONFIG.TIMEZONE}`);
            console.log(` Registration Open: ${CONFIG.ALLOW_REGISTRATION}`);
            console.log(`======================================================\n`);
        });

    } catch (error) {
        console.error('[FATAL] Server startup failed:', error);
        process.exit(1);
    }
}

startServer();