// server/src/controllers/schedule.controller.js

import { APIError } from 'better-auth/api';
import { scheduleDAO } from '#db/schedule.dao';
import {collectionService } from '#services/collection.service'
import { validateScheduleData } from '#lib/validation/schedule.schema';
import { getTargetTime } from '#lib/date-utils';
import { schedulerService } from '#services/scheduler.service';

/**
 * @route POST /api/schedules
 * @description Creates a new scheduled message and immediately queues the job.
 */
export const createSchedule = async (req, res) => {
    try {
        const { collectionId, content, hour, minute } = validateScheduleData(req.body);
        const userId = req.user.id;
        const targetDateTime = getTargetTime(hour, minute);
        const groupJids = collectionService.getGroupJids(collectionId);

        if (groupJids.length === 0) {
            return res.status(400).json({ error: "The selected collection is empty." });
        }

        // 2. CREATE (Header + Items)
        const newSchedule = await scheduleDAO.createScheduleWithItems(
            content,
            targetDateTime,
            userId,
            groupJids
        );

        // 3. QUEUE JOB
        // We pass the new ID and formatted time to the scheduler
        schedulerService.scheduleNewJob({
            id: newSchedule.id,
            scheduled_at: targetDateTime,
            content: content
        });

        res.status(201).json(newSchedule);

    } catch (error) {
        if (error instanceof APIError) {
            return res.status(error.statusCode).json({ error: error.message });
        }
        console.error('[Controller] Failed to create schedule:', error);
        res.status(500).json({ error: 'Failed to create schedule due to a server error.' });
    }
};

/**
 * @route GET /api/schedules
 * @description Fetches all scheduled messages for the current user.
 */
export const getSchedules = async (req, res) => {
    try {
        const userId = req.user.id;
        const schedules = await scheduleDAO.getSchedulesByUserId(userId);
        res.json(schedules);
    } catch (error) {
        console.error('[Controller] Failed to fetch schedules:', error);
        res.status(500).json({ error: 'Failed to retrieve schedules.' });
    }
};

/**
 * @route DELETE /api/schedules/:id
 * @description Deletes a scheduled message and cancels the running job.
 */
export const deleteSchedule = async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) return res.status(400)
            .json({ error: 'Invalid schedule ID.' });

        schedulerService.cancelJob(id);
        await scheduleDAO.deleteSchedule(id);

        res.status(204).send();
    } catch (error) {
        console.error('[Controller] Failed to delete schedule:', error);
        res.status(500).json({ error: 'Failed to delete schedule.' });
    }
};