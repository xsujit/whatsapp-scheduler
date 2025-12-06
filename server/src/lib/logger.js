// server/lib/logger.js

import { pino } from 'pino';

// Define the desired minimum logging level:
// 'silent' (no logs)
// 'error' (level 50)
// 'warn' (level 40)
// 'info' (level 30 - current default)
// 'debug' (level 20)
const LOG_LEVEL = 'warn'; // Recommended: Only display Warnings, Errors, and Fatal messages.

// Create a Pino logger instance for Baileys
// The transport pretty-prints the JSON logs into human-readable format.
export const logger = pino({
    level: LOG_LEVEL,
    transport: {
        target: 'pino-pretty',
        options: {
            colorize: true,
            ignore: 'pid,hostname,class', // Hide unnecessary JSON fields
        },
    },
});

// If you want to completely disable all logs, set LOG_LEVEL to 'silent'
// or configure Pino to suppress the output.