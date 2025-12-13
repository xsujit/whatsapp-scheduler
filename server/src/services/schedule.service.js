// server/src/services/schedule.service.js

import { scheduleDAO } from '#db/schedule.dao';
import { collectionService } from '#services/collection.service';
import { schedulerService } from '#services/scheduler.service';
import { getTargetTime } from '#lib/date-utils';
import { APIError } from 'better-auth/api';
import { DateTime } from 'luxon';
import { CONFIG } from '#config';

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
        const groupJids = await collectionService.getGroupJids(collectionId);

        if (groupJids.length === 0) {
            // If triggered by system, we might log instead of throwing, but for now throw is safe
            throw new APIError("BAD_REQUEST", { message: "Collection is empty." });
        }

        // 1. Determine Time
        const intendedTime = options.forcedTime ? options.forcedTime : getTargetTime(hour, minute);

        // 2. Persist to DB
        const newSchedule = await scheduleDAO.createScheduleWithItems(
            content,
            intendedTime,
            userId,
            groupJids,
            options.definitionId || null
        );

        // 3. Queue the Items
        await schedulerService.scheduleOneTimeJobBatch(newSchedule, newSchedule.items);

        return newSchedule;
    },

    async createRecurringSchedule(userId, { collectionId, content, hour, minute }) {
        const groupJids = await collectionService.getGroupJids(collectionId);
        if (groupJids.length === 0) {
            throw new APIError("BAD_REQUEST", { message: "Collection is empty." });
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
        console.log('--- [Service] Syncing Job Schedulers ---');

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
        console.log('--- [Service] Sync Complete ---');
    }
};