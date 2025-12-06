// server/src/auth.js

import { betterAuth } from 'better-auth';
import { APIError, createAuthMiddleware } from 'better-auth/api';

import { db } from '#db';
import { CONFIG } from '#config';
import { serverSignUpSchema } from '#lib/validation';

export const auth = betterAuth({
    database: {
        db: db,
        type: 'sqlite',
    },
    emailAndPassword: {
        enabled: true,
    },
    hooks: {
        before: createAuthMiddleware(async (ctx) => {
            // Check specific path for registration
            if (ctx.path === "/sign-up/email") {

                // 1. Check Config Switch
                if (!CONFIG.ALLOW_REGISTRATION) {
                    throw new APIError("FORBIDDEN", {
                        message: "User registration is currently closed."
                    });
                }

                // 2. Validate Body
                const result = serverSignUpSchema.safeParse(ctx.body);

                if (!result.success) {
                    const errorMessage = result.error.issues.map(i => i.message).join(", ");
                    throw new APIError("BAD_REQUEST", {
                        message: `Validation Error: ${errorMessage}`
                    });
                }
            }
            // For other paths, proceed normally
        }),
    },
});