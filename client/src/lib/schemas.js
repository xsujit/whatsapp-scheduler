// client/src/lib/schemas.js

import { z } from 'zod';

export const signUpSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.email('Please enter a valid email address'),
    password: z.string()
        .min(8, 'Password must be at least 8 characters')
        .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
        .regex(/[0-9]/, 'Password must contain at least one number'),
});

export const signInSchema = z.object({
    email: z.email('Please enter a valid email address'),
    password: z.string().min(1, 'Password is required'),
});