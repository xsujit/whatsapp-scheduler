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

const app = express();

// 1. GLOBAL MIDDLEWARE
app.use(cors({
    origin: CONFIG.CLIENT_ORIGIN,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
}));

app.use(express.json());

// 2. AUTHENTICATION ROUTES
app.all('/api/auth/*splat', toNodeHandler(auth));

// 3. ROUTING
app.use('/', systemRoutes); 

// 4. API ROUTES (Protected)
app.use('/api', protectRoute, scheduleRoutes);

// 5. CLIENT STATIC FILES
app.use(express.static(CONFIG.CLIENT_DIST_PATH));

// Catch-all: Send index.html for any other request (SPA support)
app.get('/*splat', (req, res) => {
    res.sendFile(path.join(CONFIG.CLIENT_DIST_PATH, 'index.html'));
});

export default app;