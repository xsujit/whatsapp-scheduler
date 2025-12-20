// server/src/bin/server.js

import app from '../app.js';
import { CONFIG } from '#config';
import { logger } from '#lib/logger';

async function startApi() {
    try {
        const server = app.listen(CONFIG.PORT, CONFIG.LOCALHOST, () => {
            // Log startup configuration (JSON in Prod, Pretty in Dev)
            logger.info({
                port: CONFIG.PORT,
                timezone: CONFIG.TIMEZONE,
                registrationOpen: CONFIG.ALLOW_REGISTRATION,
                mode: process.env.NODE_ENV,
            }, '[API] WhatsApp Scheduler Started');
        });

        const shutdown = async (signal) => {
            logger.warn({ signal }, 'Shutting down API...');

            // Gracefully close the HTTP server
            await new Promise((resolve, reject) => {
                server.close((err) => {
                    if (err) return reject(err);
                    resolve();
                });
            });

            logger.info('[HTTP] Server closed successfully');
            process.exit(0);
        };

        // Listen for termination signals
        process.on('SIGTERM', () => shutdown('SIGTERM'));
        process.on('SIGINT', () => shutdown('SIGINT'));

    } catch (error) {
        logger.fatal({ err: error }, 'API startup failed');
        process.exit(1);
    }
}

// --- Global Process Safety Nets ---

// 1. Uncaught Exception: Sync error not caught by try/catch
process.on('uncaughtException', (err) => {
    logger.fatal({ err }, 'Uncaught Exception! Shutting down...');
    // In production, you generally want to exit on uncaughtException because
    // the process state might be corrupted.
    process.exit(1);
});

// 2. Unhandled Rejection: Async Promise rejected without .catch()
process.on('unhandledRejection', (reason) => {
    logger.fatal({ err: reason }, 'Unhandled Rejection! Shutting down...');
    process.exit(1);
});

startApi();