// server/src/middleware/auth.middleware.js

import { fromNodeHeaders } from 'better-auth/node';
import { auth } from '#lib/auth';
import { AppError } from '#lib/errors/AppError';
import { asyncHandler } from '#utils/asyncHandler';

/**
 * Middleware to protect routes that require authentication.
 * Uses asyncHandler to automatically catch and forward unexpected errors.
 */
export const protectRoute = asyncHandler(async (req, res, next) => {
    const session = await auth.api.getSession({
        headers: fromNodeHeaders(req.headers)
    });

    if (!session) {
        // This will be caught by the global error handler and returned as 401
        throw new AppError('Unauthorized: Please sign in.', 401);
    }

    req.user = session.user;
    req.session = session.session;

    next();
});
