// server/src/lib/validation/registration.schema.js

import { z } from 'zod';

// --- Auth Schemas ---
export const serverSignUpSchema = z.object({
    name: z.string().min(2),
    email: z.email(),
    password: z.string()
        .min(8)
        .regex(/[A-Z]/, 'Password too weak: missing uppercase')
        .regex(/[0-9]/, 'Password too weak: missing number'),
});

// --- API Endpoint Schemas ---
export const scheduleRequestSchema = z.object({
    message: z.string()
        .min(1, 'Message cannot be empty')
        .max(1000, 'Message is too long (max 1000 chars)')
        .trim()
});

// Pagination Schema
export const paginationSchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
});

export const deleteJobsSchema = z.object({
    ids: z.array(z.coerce.number().int().min(1))
        .min(1, 'At least one job ID must be provided for deletion.'),
});