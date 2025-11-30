// server/lib/validation.js

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
        .trim() // Removes leading/trailing whitespace
});