// server/src/middleware/requestLogger.js

import { logger } from '#lib/logger';

/**
 * HTTP Request Logger
 * Instead of manual console log in controllers, we use a middleware 
 * that logs the start and completion of requests, including response time.
 */
export const requestLogger = (req, res, next) => {
    // 1. Log the incoming request
    logger.info({
        event: 'http_request',
        method: req.method,
        url: req.originalUrl,
        ip: req.ip,
    }, 'Incoming Request');

    const start = Date.now();

    // 2. Hook into response finish to log the outcome
    res.on('finish', () => {
        const duration = Date.now() - start;
        const level = res.statusCode >= 400 ? 'warn' : 'info';

        logger[level]({
            event: 'http_response',
            method: req.method,
            url: req.originalUrl,
            status: res.statusCode,
            duration: `${duration}ms`,
        }, 'Request Completed');
    });

    next();
};