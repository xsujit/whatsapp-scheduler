// server/src/lib/validation/collection.schema.js

import { z } from 'zod';

export const collectionSchema = z.object({
    name: z.string()
        .min(1, 'Collection name cannot be empty.')
        .max(100, 'Collection name is too long (max 100 chars).'),

    groupJids: z.array(
        z.string().min(1, { error: "Group JID cannot be empty." }))
});

/**
 * Validates collection data.
 * Throws ZodError if validation fails (caught by Global Error Handler).
 */
export const validateCollectionData = (data) => {
    return collectionSchema.parse(data);
};