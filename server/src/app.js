// server/src/app.js

import express from 'express';
import cors from 'cors';
import path from 'path';
import { toNodeHandler } from 'better-auth/node';
import { CONFIG } from '#config';
import { auth } from '#lib/auth';
import { protectRoute } from '#middleware/auth.middleware';
import scheduleRoutes from '#routes/schedule.routes';
import systemRoutes from '#routes/system.routes';
import { globalErrorHandler } from '#middleware/error.middleware';
import { requestLogger } from '#middleware/requestLogger';
import { AppError } from '#lib/errors/AppError';

const app = express();

// 1. GLOBAL MIDDLEWARE
app.use(cors({
    origin: CONFIG.CLIENT_ORIGIN,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
}));

app.use(express.json());

// --- LOGGING MIDDLEWARE (Place before routes) ---
app.use(requestLogger);

// 2. AUTHENTICATION ROUTES
app.all('/api/auth/*splat', toNodeHandler(auth));

// 3. ROUTING
app.use('/', systemRoutes);

// 4. API ROUTES (Protected)
app.use('/api', protectRoute, scheduleRoutes);

// 5. CLIENT STATIC FILES
app.use(express.static(CONFIG.CLIENT_DIST_PATH));

// Catch-all: Send index.html for SPA
app.get('/*splat', (req, res) => {
    res.sendFile(path.join(CONFIG.CLIENT_DIST_PATH, 'index.html'));
});

// --- 404 HANDLER (For unknown API routes) ---
app.all('/{*any}', (req, res, next) => {
    next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// --- GLOBAL ERROR HANDLER (Must be last) ---
app.use(globalErrorHandler);

export default app;