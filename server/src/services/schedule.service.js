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
     * Creates a ONE-TIME schedule.
     */
    async createOneTimeSchedule(userId, { collectionId, content, hour, minute }) {
        const groupJids = await collectionService.getGroupJids(collectionId);
        if (groupJids.length === 0) {
            throw new APIError("BAD_REQUEST", { message: "The selected collection is empty." });
        }

        const targetDateTime = getTargetTime(hour, minute);

        const newSchedule = await scheduleDAO.createScheduleWithItems(
            content,
            targetDateTime,
            userId,
            groupJids,
            null // No definition ID for one-off
        );

        // Queue in Node-Schedule
        schedulerService.scheduleOneTimeJob({
            id: newSchedule.id,
            scheduled_at: targetDateTime,
            content: content
        });

        return newSchedule;
    },

    /**
     * Creates a RECURRING (Daily) Definition.
     * Triggers the scheduler to start listening for this rule.
     */
    async createRecurringSchedule(userId, { collectionId, content, hour, minute }) {
        // Validate collection exists/is valid (optional, but good practice)
        const groupJids = await collectionService.getGroupJids(collectionId);
        if (groupJids.length === 0) {
            // We allow creating empty recurring rules? 
            // Maybe warn, but for now let's block to prevent confusion.
            throw new APIError("BAD_REQUEST", { message: "The selected collection is empty." });
        }

        const definition = await scheduleDAO.createDefinition({
            content, userId, collectionId, hour, minute
        });

        // Register the rule in the Scheduler
        schedulerService.scheduleRecurringRule(definition);

        return definition;
    },

    // Helper to generate the Child Instance from the Rule
    async instantiateRecurringJob(definition) {
        console.log(`[Service] Instantiating Recurring Job for Rule #${definition.id}`);

        try {
            const groupJids = await collectionService.getGroupJids(definition.collection_id);

            if (groupJids.length === 0) {
                console.warn(`[Service] Rule #${definition.id} skipped: Collection empty.`);
                return;
            }

            const scheduledDateTime = DateTime.now().setZone(CONFIG.TIMEZONE);

            // 1. Create the Child (Execution) in DB
            const childSchedule = await scheduleDAO.createScheduleWithItems(
                definition.content,
                scheduledDateTime,
                definition.user_id,
                groupJids,
                definition.id
            );

            // 2. Execute Immediately
            // We reuse the logic for executing a job
            schedulerService.triggerImmediateExecution(childSchedule);

        } catch (error) {
            console.error(`[Service] Failed to instantiate rule #${definition.id}:`, error);
        }
    }
};