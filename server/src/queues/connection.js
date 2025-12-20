// server/src/queues/connection.js

import { Redis } from 'ioredis';
import { CONFIG } from '#config';
import { logger } from '#lib/logger';

const connectionOptions = {
    host: CONFIG.LOCALHOST,
    port: CONFIG.REDIS_PORT,
    password: CONFIG.REDIS_PASSWORD,
    maxRetriesPerRequest: null, // Critical for BullMQ
};

export const redisConnection = new Redis(connectionOptions);

redisConnection.on('error', (err) => {
    logger.error({ err }, '[Redis] Connection Error');
});

redisConnection.on('connect', () => {
    logger.info('[Redis] Connected to DragonflyDB');
});

redisConnection.on('reconnecting', () => {
    logger.warn('[Redis] Reconnecting to DragonflyDB');
});