// server/auth.js

import { betterAuth } from 'better-auth';
import Database from 'better-sqlite3';
import { Kysely, SqliteDialect, sql } from 'kysely';
import { APIError, createAuthMiddleware } from 'better-auth/api';
import { serverSignUpSchema } from './lib/validation.js';

// 1. Setup local database
const rawDb = new Database('app.db');
rawDb.pragma('journal_mode = WAL');

export const db = new Kysely({
    dialect: new SqliteDialect({
        database: rawDb,
    }),
});

(async () => {
    try {
        await db.schema
            .createTable('scheduled_messages')
            .ifNotExists()
            .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
            .addColumn('jid', 'text', (col) => col.notNull())
            .addColumn('content', 'text', (col) => col.notNull())
            .addColumn('scheduled_at', 'text', (col) => col.notNull())
            .addColumn('status', 'text', (col) => col.notNull()) // PENDING, COMPLETED, FAILED, EXPIRED
            .addColumn('created_at', 'text', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`))
            .execute();
        console.log('[DB] "scheduled_messages" table verified.');
    } catch (err) {
        console.error('[DB] Failed to initialize tables:', err);
    }
})();

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
            if (ctx.path === "/sign-up/email") {
                const result = serverSignUpSchema.safeParse(ctx.body);

                if (!result.success) {
                    const errorMessage = result.error.issues.map(i => i.message).join(", ");
                    throw new APIError("BAD_REQUEST", {
                        message: `Validation Error: ${errorMessage}`
                    });
                }

                // If successful, the middleware simply returns, allowing the 
                // sign-up process to continue.
            }

            // For any other path (like /sign-in/email or /verification/email), 
            // the middleware does nothing and the request proceeds normally.
        }),
    },
});