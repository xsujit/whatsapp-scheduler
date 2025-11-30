// server/auth.js

import { betterAuth } from "better-auth";
import Database from "better-sqlite3";
import { Kysely, SqliteDialect, sql } from 'kysely';

// 1. Setup local database
const rawDb = new Database("app.db");
rawDb.pragma('journal_mode = WAL');

// 2. Instantiate Kysely
export const db = new Kysely({
    dialect: new SqliteDialect({
        database: rawDb,
    }),
});

// 3. Initialize Custom Tables (Schema Migration)
// We run this immediately to ensure the table exists before the server accepts requests.
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

// 4. Configure Better Auth
export const auth = betterAuth({
    database: {
        db: db,
        type: "sqlite",
    },
    emailAndPassword: {
        enabled: true,
    },
    trustedOrigins: ["http://localhost:5173"],
});