// server/src/controllers/schedule.controller.js
import { scheduleService } from '#services/schedule.service';
import { scheduleDAO } from '#db/schedule.dao';
import { validateScheduleData } from '#lib/validation/schedule.schema';
import { schedulerService } from '#services/scheduler.service';

/**
 * @route POST /api/schedules
 * @description Creates either a One-Time or Recurring schedule based on payload type.
 */
export const createSchedule = async (req, res) => {
    try {
        // Validate payload (assumes schema handles 'type', 'hour', 'minute', 'content', 'collectionId')
        const validated = validateScheduleData(req.body);
        const userId = req.user.id;

        let result;
        if (validated.type === 'DAILY') {
            result = await scheduleService.createRecurringSchedule(userId, validated);
        } else {
            // Default to ONCE if not specified or explicitly ONCE
            result = await scheduleService.createOneTimeSchedule(userId, validated);
        }

        res.status(201).json({
            message: validated.type === 'DAILY' ? 'Recurring schedule created.' : 'Message scheduled.',
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

// TODO: getSchedules now likely needs to return two lists:
// 1. Active Definitions (Recurring Rules)
// 2. Execution History (One Time + Recurring Instances)
// For now, keep getSchedules returning existing history, and add a new endpoint for definitions if needed.

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