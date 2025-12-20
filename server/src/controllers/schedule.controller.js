// server/src/controllers/schedule.controller.js

import { scheduleService } from '#services/schedule.service';
import { scheduleDAO } from '#db/schedule.dao';
import { validateScheduleData } from '#lib/validation/schedule.schema';
import { schedulerService } from '#services/scheduler.service';
import { RECURRENCE_TYPE } from '#types/enums';
import { asyncHandler } from '#utils/asyncHandler';
import { AppError } from '#lib/errors/AppError';

/**
 * Validation errors will throw automatically and be caught by global handler
 * @route POST /api/schedules
 */
export const createSchedule = asyncHandler(async (req, res) => {
    const validated = validateScheduleData(req.body);
    const userId = req.user.id;

    let result;
    let message;

    if (validated.type === RECURRENCE_TYPE.DAILY) {
        message = 'Recurring schedule created.';
        result = await scheduleService.createRecurringSchedule(userId, validated);
    } else {
        message = 'Message scheduled.';
        result = await scheduleService.createSchedule(userId, validated);
    }

    res.status(201).json({ message, schedule: result });
});

/**
 * @route GET /api/schedules/definitions
 */
export const getRecurringSchedules = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const definitions = await scheduleDAO.getDefinitionsByUserId(userId);
    res.json(definitions);
});

/**
 * @route DELETE /api/schedules/definitions/:id
 */
export const deleteRecurringSchedule = asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id, 10);

    if (isNaN(id)) {
        throw new AppError('Invalid schedule definition ID.', 400);
    }

    await Promise.all([
        schedulerService.cancelRecurringRule(id),
        scheduleDAO.deactivateDefinition(id)
    ]);

    res.status(204).send();
});

// TODO: Deprecate getSchedules and getRecurringSchedules, use getSchedulesOverview instead

/**
 * @route GET /api/schedules/overview
 * @description Fetches a consolidated view of active recurring rules (Definitions) 
 * and the execution history (Scheduled Messages/Instances).
 */
export const getSchedulesOverview = asyncHandler(async (req, res) => {
    const userId = req.user.id;

    // Fetch both sets of data in parallel for performance
    const [activeRules, executionHistory] = await Promise.all([
        scheduleDAO.getDefinitionsByUserId(userId),
        scheduleDAO.getSchedulesByUserId(userId)
    ]);

    res.json({
        activeRules,
        executionHistory
    });
});

/**
 * @route GET /api/schedules
 * @description Fetches execution history (One Time jobs + Instances of Recurring jobs).
 */
export const getSchedules = asyncHandler(async (req, res) => {
    const userId = req.user.id;

    // This DAO method returns the 'scheduled_messages' (History/Log)
    const schedules = await scheduleDAO.getSchedulesByUserId(userId);
    res.json(schedules);
});

/**
 * @route DELETE /api/schedules/:id
 * @description Deletes a specific scheduled message (History/Pending One-Time).
 */
export const deactivateSchedule = asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id, 10);

    if (isNaN(id)) {
        throw new AppError('Invalid schedule ID.', 400);
    }

    const schedule = await scheduleDAO.getScheduleWithPendingItems(id);

    await Promise.all([
        schedulerService.cancelOneTimeJob(schedule),
        scheduleDAO.deactivateSchedule(id)
    ]);

    res.status(204).send();
});