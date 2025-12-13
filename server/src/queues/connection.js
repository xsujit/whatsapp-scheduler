// server/src/queues/connection.js

import { Redis } from 'ioredis';

const connectionOptions = {
    host: process.env.REDIS_HOST || '127.0.0.1', // Localhost for PM2 -> Docker
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    maxRetriesPerRequest: null, // Critical for BullMQ
};

export const redisConnection = new Redis(connectionOptions);

redisConnection.on('error', (err) => {
    console.error('[Redis] Connection Error:', err);
});

redisConnection.on('connect', () => {
    console.log('[Redis] Connected to DragonflyDB');
});