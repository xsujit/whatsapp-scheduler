// server/src/lib/logger.js

import { pino } from 'pino';
import { CONFIG } from '#config';

/**
 * Environment-aware logger. 
 * In Development, it stays pretty and readable. 
 * In Production, it outputs high-performance NDJSON (Newline Delimited JSON) 
 * which is standard for ingestion by tools like Datadog, CloudWatch, or ELK Stack.
 */

// Determine if we are in development mode
const isDev = process.env.NODE_ENV !== 'production';

// Configuration for Pino
const transport = isDev ?
    {
        target: 'pino-pretty',
        options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
        },
    } : undefined; // No transport in production (stdout JSON is fastest)

export const logger = pino({
    level: process.env.LOG_LEVEL || 'info',
    base: isDev ? undefined : { pid: process.pid, hostname: CONFIG.HOSTNAME }, // Add metadata in prod
    timestamp: pino.stdTimeFunctions.isoTime,
    transport,
});
