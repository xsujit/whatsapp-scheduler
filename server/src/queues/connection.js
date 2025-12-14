// server/src/queues/connection.js

import { Redis } from 'ioredis';
import { CONFIG } from '#config';

const connectionOptions = {
    host: CONFIG.REDIS_HOST,
    port: CONFIG.REDIS_PORT,
    password: CONFIG.REDIS_PASSWORD,
    maxRetriesPerRequest: null, // Critical for BullMQ
};

export const redisConnection = new Redis(connectionOptions);

redisConnection.on('error', (err) => {
    console.error('[Redis] Connection Error:', err);
});

redisConnection.on('connect', () => {
    console.log('[Redis] Connected to DragonflyDB');
});

redisConnection.on('reconnecting', () => {
    console.log('[Redis] Reconnecting to DragonflyDB');
});