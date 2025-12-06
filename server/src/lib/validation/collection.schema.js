// server/src/lib/validation/collection.schema.js

import { z } from 'zod';
import { APIError } from 'better-auth/api';

export const collectionSchema = z.object({
    name: z.string()
        .min(1, { message: "Collection name is required." })
        .max(100, { message: "Collection name must be 100 characters or less." }),

    groupJids: z.array(
        z.string().min(1, { message: "Group JID cannot be empty." }))
        .optional()
        .default([]),
});

/**
 * Utility function to handle Zod validation and throw APIError.
 * 
 * @param {Object} data - Data to validate
 * @returns {Object} Validated data
 */
export const validateCollectionData = (data) => {
    const result = collectionSchema.safeParse(data);
    if (!result.success) {
        const errorMessage = result.error.issues.map(i => i.message).join(", ");
        throw new APIError("BAD_REQUEST", { message: `Validation Error: ${errorMessage}` });
    }
    return result.data;
};
