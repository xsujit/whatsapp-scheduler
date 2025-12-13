// server/src/lib/status.bridge.js

import { redisConnection } from '#queues/connection';

const STATUS_KEY = 'system:whatsapp:status';
const CACHE_TTL_SECONDS = 60; // Auto-expire if worker dies

export const statusBridge = {
    /**
     * WORKER SIDE: Publishes the current service status to Redis.
     * @param {Object} statusObj - { connected: boolean, jid: string }
     */
    async updateStatus(statusObj) {
        try {
            await redisConnection.set(
                STATUS_KEY,
                JSON.stringify({
                    ...statusObj,
                    last_updated: new Date().toISOString()
                }),
                'EX',
                CACHE_TTL_SECONDS
            );
        } catch (err) {
            console.error('[StatusBridge] Failed to update status:', err);
        }
    },

    /**
     * API SIDE: Reads the status from Redis.
     * Returns a default "Down" state if Redis is empty (Worker dead).
     */
    async getStatus() {
        try {
            const raw = await redisConnection.get(STATUS_KEY);
            if (!raw) {
                return { connected: false, jid: 'worker-offline' };
            }
            return JSON.parse(raw);
        } catch (err) {
            console.error('[StatusBridge] Failed to read status:', err);
            return { connected: false, jid: 'error' };
        }
    }
};