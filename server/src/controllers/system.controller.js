// server/src/controllers/system.controller.js

import { CONFIG } from '#config';
import { statusBridge } from '#lib/status.bridge';
import { asyncHandler } from '#utils/asyncHandler';

/**
 * @route GET /health
 * @description Returns system health, uptime, and WhatsApp connection status.
 */
export const getHealthStatus = asyncHandler(async (req, res) => {
    const uptime = process.uptime();
    const waStatus = await statusBridge.getStatus();

    const status = {
        status: 'UP',
        timestamp: new Date().toISOString(),
        uptimeSeconds: Math.floor(uptime),
        service: 'WhatsApp Scheduler API',
        whatsapp: {
            connected: waStatus.connected,
            jid: waStatus.connected ? waStatus.jid : 'disconnected'
        },
        memoryMB: Math.round(process.memoryUsage().rss / 1024 / 1024)
    };

    res.status(200).json(status);
});

/**
 * @route GET /api/config
 * @description Returns public configuration flags.
 */
export const getPublicConfig = (req, res) => {
    res.json({
        allowRegistration: CONFIG.ALLOW_REGISTRATION
    });
};