// server/src/lib/validation/schedule.schema.js

import { z } from 'zod';

/**
 * Zod schema for validating a new scheduled message request.
 */
export const scheduleSchema = z.object({
    // Must be a valid collection ID
    collectionId: z.number({
        required_error: "Collection ID is required.",
        invalid_type_error: "Collection ID must be a number."
    }).int().positive(),

    // The message content
    content: z.string()
        .min(1, { message: "Message content cannot be empty." })
        .max(4096, { message: "Message content exceeds 4096 characters." }),

    // Hour of the day (0-23)
    hour: z.number({
        required_error: "Hour is required."
    }).int().min(0).max(23),

    // Minute of the hour (0-59)
    minute: z.number({
        required_error: "Minute is required."
    }).int()
        .min(0)
        .max(59),
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
        const errorMessage = result.error.issues.map(i => i.message).join(", ");
        throw new APIError("BAD_REQUEST", { message: `Validation Error: ${errorMessage}` });
    }
    return result.data;
};