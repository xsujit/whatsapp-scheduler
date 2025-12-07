// server/src/lib/validation/schedule.schema.js

import { z } from 'zod';
import { APIError } from 'better-auth/api';
import { RECURRENCE_TYPE_VALUES, RECURRENCE_TYPE } from '#types/enums';

/**
 * Zod schema for validating a new scheduled message request.
 */
export const scheduleSchema = z.object({
    // User still selects a collection ID to populate the initial list
    collectionId: z.number({
        required_error: 'Collection ID is required.',
        invalid_type_error: 'Collection ID must be a number.'
    }).int().positive(),

    content: z.string()
        .min(1, { message: 'Message content cannot be empty.' })
        .max(4096, { message: 'Message content exceeds 4096 characters.' }),

    hour: z.number().int().min(0).max(23),
    minute: z.number().int().min(0).max(59),

    type: z.enum(RECURRENCE_TYPE_VALUES, {
        required_error: 'Schedule type is required.',
        invalid_type_error: `Schedule type must be one of ${RECURRENCE_TYPE_VALUES}`
    }).default(RECURRENCE_TYPE.ONCE),
});

/**
 * Utility function to handle Zod validation and throw APIError.
 * 
 * @param {Object} data - Data to validate
 * @returns {Object} Validated data
 */
export const validateScheduleData = (data) => {
    const result = scheduleSchema.safeParse(data);
    if (!result.success) {
        const errorMessage = result.error.issues.map(i => i.message).join(', ');
        throw new APIError('BAD_REQUEST', { message: `Validation Error: ${errorMessage}` });
    }
    return result.data;
};