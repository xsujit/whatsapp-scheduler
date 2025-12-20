// server/src/services/schedule.service.js

import { scheduleDAO } from '#db/schedule.dao';
import { collectionService } from '#services/collection.service';
import { schedulerService } from '#services/scheduler.service';
import { getTargetTime } from '#lib/date-utils';
import { AppError } from '#lib/errors/AppError';
import { DateTime } from 'luxon';
import { logger } from '#lib/logger';

export const scheduleService = {
    /**
     * Unified method for creating schedules.
     * @param {string} userId
     * @param {object} payload - { collectionId, content, hour, minute }
     * @param {object} options - Optional overrides
     * @param {DateTime} [options.forcedTime] - Override the time calculation (for recurring triggers)
     * @param {number} [options.definitionId] - Link to a recurring definition
     */
    async createSchedule(userId, payload, options = {}) {
        const { collectionId, content, hour, minute } = payload;
        
        // 1. Validate Business Logic
        const groupJids = await collectionService.getGroupJids(collectionId);
        if (!groupJids || groupJids.length === 0) {
            throw new AppError('The selected collection has no groups. Cannot schedule message.', 400);
        }

        // 2. Determine Time
        const intendedTime = options.forcedTime ? options.forcedTime : getTargetTime(hour, minute);

        // 3. Persist to DB
        const newSchedule = await scheduleDAO.createScheduleWithItems(
            content,
            intendedTime,
            userId,
            groupJids,
            options.definitionId || null
        );

        // 4. Queue the Items
        // If Redis fails here, it will throw a generic error, caught by Global Handler (500)
        await schedulerService.scheduleOneTimeJobBatch(newSchedule, newSchedule.items);

        return newSchedule;
    },

    async createRecurringSchedule(userId, { collectionId, content, hour, minute }) {
        const groupJids = await collectionService.getGroupJids(collectionId);
        
        if (!groupJids || groupJids.length === 0) {
            throw new AppError('The selected collection has no groups.', 400);
        }

        const definition = await scheduleDAO.createDefinition({
            content, userId, collectionId, hour, minute
        });

        await schedulerService.scheduleRecurringRule(definition);
        return definition;
    },

    // --- RESTORE ---

    /**
     * Syncs DB state with BullMQ on startup.
     * Since BullMQ persists data, we only need to ensure Job Schedulers (Cron) match DB.
     */
    async restoreSchedules() {
        logger.info('[Service] Restoring schedules');

        // 1. Sync Recurring Rules
        // We re-upsert them to ensure the Queue matches the DB exactly.
        const definitions = await scheduleDAO.getDefinitions();
        for (const def of definitions) {
            if (def.is_active) {
                await schedulerService.scheduleRecurringRule(def);
            }
        }

        // Note: We do NOT need to restore One-Time jobs. 
        // BullMQ/DragonflyDB saved them to disk. They will resume automatically.
        logger.info('[Service] Recurring rules restored');
    }
};