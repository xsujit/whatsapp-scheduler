// server/src/lib/errors/AppError.js

/**
 * A standardized Error object to distinguish between 
 * Operational Errors (invalid input, not found - things we expect) 
 * and Programmer Errors (bugs, crashes).
 */
export class AppError extends Error {
    /**
     * @param {string} message - Error message
     * @param {number} statusCode - HTTP status code (default 500)
     * @param {boolean} isOperational - Is this a predicted error? (default true)
     */
    constructor(message, statusCode = 500, isOperational = true) {
        super(message);
        this.statusCode = statusCode;
        this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
        this.isOperational = isOperational;

        // Capture stack trace but exclude constructor call from it
        Error.captureStackTrace(this, this.constructor);
    }
}