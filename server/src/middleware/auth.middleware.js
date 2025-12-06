// server/src/middleware/auth.middleware.js

import { fromNodeHeaders } from 'better-auth/node';
import { auth } from '../lib/auth.js';

/**
 * Middleware to protect routes that require authentication.
 * Attaches the user object to req.user if successful.
 */
export const protectRoute = async (req, res, next) => {
    try {
        const session = await auth.api.getSession({
            headers: fromNodeHeaders(req.headers)
        });

        if (!session) {
            return res.status(401).json({ error: 'Unauthorized: Please sign in.' });
        }

        req.user = session.user;
        req.session = session.session;
        next();
    } catch (error) {
        console.error('[AUTH] Middleware Error:', error);
        return res.status(500).json({ error: 'Internal Auth Error' });
    }
};