// server/src/routes/system.routes.js

import { Router } from 'express';
import { protectRoute } from '#middleware/auth.middleware';
import * as systemController from '#controllers/system.controller';
import { setupBullDashboard } from '#lib/queue-dashboard';

const router = Router();
const dashboardAdapter = setupBullDashboard();

// Public System Routes
router.get('/health', systemController.getHealthStatus);
router.get('/api/config', systemController.getPublicConfig);

// Protected System Routes
router.use('/admin/queues', protectRoute, dashboardAdapter.getRouter());

export default router;