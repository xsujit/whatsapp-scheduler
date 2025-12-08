// server/src/controllers/schedule.controller.js

import { scheduleService } from '#services/schedule.service';
import { scheduleDAO } from '#db/schedule.dao';
import { validateScheduleData } from '#lib/validation/schedule.schema';
import { schedulerService } from '#services/scheduler.service';
import { RECURRENCE_TYPE } from '#types/enums'

/**
 * @route POST /api/schedules
 * @description Creates either a One-Time or Recurring schedule based on payload type.
 */
export const createSchedule = async (req, res) => {
    try {
        const validated = validateScheduleData(req.body);
        const userId = req.user.id;

        let result;
        if (validated.type === RECURRENCE_TYPE.DAILY) {
            result = await scheduleService.createRecurringSchedule(userId, validated);
        } else {
            // Default to ONCE if not specified or explicitly ONCE
            result = await scheduleService.createOneTimeSchedule(userId, validated);
        }

        const message = validated.type === RECURRENCE_TYPE.DAILY ? 'Recurring schedule created.' : 'Message scheduled.';

        res.status(201).json({
            message,
            schedule: result
        });
    } catch (error) {
        console.error('[Controller] Create Schedule Error:', error);
        // Handle specific validation errors if your validator throws them
        const status = error.statusCode || 500;
        res.status(status).json({ error: error.message || 'Failed to create schedule.' });
    }
};

/**
 * @route GET /api/schedules/definitions
 * @description Fetches all active recurring rules (definitions) for the user.
 */
export const getRecurringSchedules = async (req, res) => {
    try {
        const userId = req.user.id;
        const definitions = await scheduleDAO.getDefinitionsByUserId(userId);
        res.json(definitions);
    } catch (error) {
        console.error('[Controller] Failed to fetch definitions:', error);
        res.status(500).json({ error: 'Failed to retrieve recurring schedules.' });
    }
};

/**
 * @route DELETE /api/schedules/definitions/:id
 * @description Deletes a recurring rule and cancels the cron job.
 */
export const deleteRecurringSchedule = async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) return res.status(400).json({ error: 'Invalid definition ID.' });

        // 1. Cancel the node-schedule job
        // Note: Ensure schedulerService handles "RULE_{id}" cancellation
        schedulerService.cancelJob(id);

        // 2. Deactive the record
        await scheduleDAO.deactivateDefinition(id);

        res.status(204).send();
    } catch (error) {
        console.error('[Controller] Failed to delete definition:', error);
        res.status(500).json({ error: 'Failed to delete recurring schedule.' });
    }
};

// TODO: Deprecate getSchedules and getRecurringSchedules, use getSchedulesOverview instead

/**
 * @route GET /api/schedules/overview
 * @description Fetches a consolidated view of active recurring rules (Definitions) 
 * and the execution history (Scheduled Messages/Instances).
 */
export const getSchedulesOverview = async (req, res) => {
    try {
        const userId = req.user.id;

        // Fetch both sets of data in parallel for performance
        const [activeRules, executionHistory] = await Promise.all([
            // 1. Active Rules (The recurring definitions)
            scheduleDAO.getDefinitionsByUserId(userId),
            // 2. Execution History (The one-time and recurring instances)
            scheduleDAO.getSchedulesByUserId(userId)
        ]);

        res.json({
            activeRules,
            executionHistory
        });
    } catch (error) {
        console.error('[Controller] Failed to fetch schedule overview:', error);
        res.status(500).json({ error: 'Failed to retrieve schedule data overview.' });
    }
};

/**
 * @route GET /api/schedules
 * @description Fetches execution history (One Time jobs + Instances of Recurring jobs).
 */
export const getSchedules = async (req, res) => {
    try {
        const userId = req.user.id;
        // This DAO method returns the 'scheduled_messages' (History/Log)
        const schedules = await scheduleDAO.getSchedulesByUserId(userId);
        res.json(schedules);
    } catch (error) {
        console.error('[Controller] Failed to fetch schedules:', error);
        res.status(500).json({ error: 'Failed to retrieve schedule history.' });
    }
};

/**
 * @route DELETE /api/schedules/:id
 * @description Deletes a specific scheduled message (History/Pending One-Time).
 */
export const deactivateSchedule = async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) return res.status(400).json({ error: 'Invalid schedule ID.' });

        // Cancel specific job instance if it's pending
        schedulerService.cancelJob(id);

        // Remove from history/queue
        await scheduleDAO.deactivateSchedule(id);

        res.status(204).send();
    } catch (error) {
        console.error('[Controller] Failed to delete schedule:', error);
        res.status(500).json({ error: 'Failed to delete schedule.' });
    }
};