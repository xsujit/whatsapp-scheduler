// server/src/bin/server.js

import app from '../app.js';
import { CONFIG } from '#config';

async function startApi() {
    try {
        const server = app.listen(CONFIG.PORT, CONFIG.LOCALHOST, () => {
            console.log(`\n================ WhatsApp Scheduler API ================`);
            console.log(` Port: ${CONFIG.PORT}`);
            console.log(` Timezone: ${CONFIG.TIMEZONE}`);
            console.log(` Registration Open: ${CONFIG.ALLOW_REGISTRATION}`);
            console.log(` Mode: ${process.env.NODE_ENV}`);
            console.log(`========================================================\n`);
        });

        const shutdown = async (signal) => {
            console.log(`\n[${signal}] Shutting down API...`);
            await new Promise(resolve => server.close(resolve));
            console.log('[HTTP] Server closed');
            process.exit(0);
        };

        process.on('SIGTERM', () => shutdown('SIGTERM'));
        process.on('SIGINT', () => shutdown('SIGINT'));

    } catch (error) {
        console.error('[FATAL] API startup failed:', error);
        process.exit(1);
    }
}

startApi();