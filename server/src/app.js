// server/src/app.js

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { toNodeHandler } from 'better-auth/node';

import { CONFIG } from '#config';
import { auth } from './lib/auth.js';
import { protectRoute } from '#middleware/auth.middleware';
import scheduleRoutes from '#routes/schedule.routes';
import { whatsappService } from '#services/whatsapp.service';

// PATH SETUP (Relative to src/app.js)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CLIENT_DIST_PATH = path.join(__dirname, '../../client/dist');

const app = express();

// 1. GLOBAL MIDDLEWARE
app.use(cors({
    origin: CONFIG.CLIENT_ORIGIN,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
}));

app.use(express.json());

// 2. AUTHENTICATION ROUTES (Better-Auth)
app.all('/api/auth/*splat', toNodeHandler(auth));

// 3. SYSTEM ROUTES
app.get('/health', (req, res) => {
    const uptimeSeconds = process.uptime();
    const uptimeString = new Date(uptimeSeconds * 1000).toISOString().substring(11, 19);
    const waStatus = whatsappService.getStatus();

    const status = {
        status: 'UP',
        timestamp: new Date().toISOString(),
        uptime: uptimeString,
        service: 'WhatsApp Scheduler',
        whatsapp: {
            connected: waStatus.connected,
            jid: waStatus.connected ? waStatus.jid : 'disconnected'
        },
        memoryMB: Math.round(process.memoryUsage().rss / 1024 / 1024)
    };

    // Return 503 if WhatsApp is down (helps monitoring tools)
    const httpStatus = waStatus.connected ? 200 : 503;
    res.status(httpStatus).json(status);
});

app.get('/api/config', (req, res) => {
    res.json({
        allowRegistration: CONFIG.ALLOW_REGISTRATION
    });
});

// 4. API ROUTES (Protected)
app.use('/api', protectRoute, scheduleRoutes);

// 5. CLIENT STATIC FILES (Production)
app.use(express.static(CLIENT_DIST_PATH));

// Catch-all: Send index.html for any other request (SPA support)
app.get('/*splat', (req, res) => {
    res.sendFile(path.join(CLIENT_DIST_PATH, 'index.html'));
});

export default app;