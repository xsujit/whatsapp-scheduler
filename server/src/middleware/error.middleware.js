// server/src/middleware/error.middleware.js

import { logger } from '#lib/logger';
import { AppError } from '#lib/errors/AppError';
import { APIError } from 'better-auth/api';
import { ZodError } from 'zod';

/**
 * Global Error Middleware
 * This is the safety net. It centralizes all error formatting. 
 * It ensures API always returns JSON, even if the app crashes hard. 
 * It also handles third-party errors (like Zod or Better-Auth) by mapping them to standard format.
 */
export const globalErrorHandler = (err, req, res, next) => {
    let error = err;

    if (error instanceof ZodError) {
        const message = error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ');
        error = new AppError(`Validation Error: ${message}`, 400);
    }

    else if (error instanceof APIError) {
        error = new AppError(error.message, error.status || 400);
    }

    error.statusCode = error.statusCode || 500;
    error.status = error.status || 'error';

    // In production, we log 500s as errors (to alert admins) and 400s as warnings
    if (error.statusCode >= 500) {
        logger.error({ err: error, reqId: req.id }, 'Unexpected Error');
    } else {
        logger.warn({ msg: error.message, statusCode: error.statusCode }, 'Operational Error');
    }

    // Development: Send detailed stack trace
    if (process.env.NODE_ENV !== 'production') {
        return res.status(error.statusCode).json({
            status: error.status,
            error: error,
            message: error.message,
            stack: error.stack,
        });
    }

    // Production: Send sanitized message
    if (error.isOperational) {
        return res.status(error.statusCode).json({
            status: error.status,
            message: error.message,
        });
    }

    // Programming or other unknown error: don't leak details
    return res.status(500).json({
        status: 'error',
        message: 'Something went wrong. Please try again later.',
    });
};