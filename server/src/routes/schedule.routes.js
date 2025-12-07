// server/src/routes/schedule.routes.js

import { Router } from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';

// Controllers
import * as scheduleController from '#controllers/schedule.controller';
import * as collectionController from '#controllers/collection.controller';
import { getAllGroups } from '#controllers/group.controller';

// Middleware
import { protectRoute } from '../middleware/auth.middleware.js';

const router = Router();

// Rate Limiter
const scheduleApiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        return req.user ? req.user.id : ipKeyGenerator(req);
    },
    message: {
        error: "Too many schedule requests. Please wait 15 minutes before trying again."
    }
});

// --- Group Routes ---
router.get('/groups', protectRoute, getAllGroups);

// --- Collection Routes ---
router.get('/collections', protectRoute, collectionController.getAllCollections);
router.get('/collections/:id', protectRoute, collectionController.getCollectionDetails);
router.post('/collections', protectRoute, collectionController.saveCollection);
router.put('/collections/:id', protectRoute, collectionController.saveCollection);
router.delete('/collections/:id', protectRoute, collectionController.deleteCollection);

// --- Schedule Routes ---
router.post('/schedules', protectRoute, scheduleApiLimiter, scheduleController.createSchedule);

// Recurring Rules (Definitions)
router.get('/schedules/definitions', protectRoute, scheduleController.getRecurringSchedules);
router.delete('/schedules/definitions/:id', protectRoute, scheduleController.deleteRecurringSchedule);

// Execution History & Management
router.get('/schedules', protectRoute, scheduleController.getSchedules);
router.delete('/schedules/:id', protectRoute, scheduleController.deactivateSchedule);

export default router;