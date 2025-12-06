// src/db/index.js

import Database from 'better-sqlite3';
import { Kysely, SqliteDialect, sql } from 'kysely';

import { MESSAGE_STATUS, MESSAGE_STATUS_VALUES } from '#types/enums';

// 1. Setup local database
const rawDb = new Database('app.db');

// Optimization: Write-Ahead Logging for concurrency
rawDb.pragma('journal_mode = WAL');
// Integrity: Enforce Foreign Key constraints (Critical for Story 1)
rawDb.pragma('foreign_keys = ON');

const quotedStatusList = MESSAGE_STATUS_VALUES.map(v => `'${v}'`).join(', ');

// 2. Export the Kysely instance
export const db = new Kysely({
    dialect: new SqliteDialect({
        database: rawDb,
    }),
});

/**
 * Initializes database tables.
 * Uses a transaction to ensure all tables exist or fail together.
 */
export async function initializeSchema() {
    try {
        await db.transaction().execute(async (trx) => {
            console.log('[DB] Checking Schema...');

            // --- 1. Scheduled Messages (UPDATED for Collection ID) ---
            // Drop existing table to ensure clean schema transition to FK constraint
            if (process.env.DROP_SCHEDULED_MESSAGES === 'true') {
                await trx.schema.dropTable('scheduled_messages').ifExists().execute();
            }

            await trx.schema
                .createTable('scheduled_messages')
                .ifNotExists()
                .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
                .addColumn('collection_id', 'integer', (col) => col.notNull()
                    .references('collections.id').onDelete('cascade')) // FK to collections
                .addColumn('content', 'text', (col) => col.notNull())
                .addColumn('scheduled_at', 'text', (col) => col.notNull())
                .addColumn('status', 'text', (col) => col
                    .notNull()
                    .defaultTo(MESSAGE_STATUS.PENDING)
                    .check(sql`status IN (${sql.raw(quotedStatusList)})`))
                // Store the original creator's user ID
                .addColumn('user_id', 'text', (col) => col.notNull())
                .addColumn('created_at', 'text', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`))
                .execute();

            // --- 2. Groups Table (Existing) ---
            // Stores the raw JID and human-readable name
            await trx.schema
                .createTable('groups')
                .ifNotExists()
                .addColumn('jid', 'text', (col) => col.primaryKey()) // JID is unique
                .addColumn('name', 'text', (col) => col.notNull())
                .addColumn('created_at', 'text', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`))
                .execute();

            // --- 3. Collections Table (Existing) ---
            // Stores the name of a list of groups (e.g., "GB 5 AM Groups")
            await trx.schema
                .createTable('collections')
                .ifNotExists()
                .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
                .addColumn('name', 'text', (col) => col.notNull())
                .addColumn('created_at', 'text', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`))
                .execute();

            // --- 4. Collection Items (Existing / Junction Table) ---
            // Maps Collections <-> Groups
            await trx.schema
                .createTable('collection_items')
                .ifNotExists()
                .addColumn('collection_id', 'integer', (col) => col.notNull()
                    .references('collections.id').onDelete('cascade')) // Auto-cleanup if collection deleted
                .addColumn('group_jid', 'text', (col) => col.notNull()
                    .references('groups.jid').onDelete('cascade')) // Auto-cleanup if group deleted
                .addPrimaryKeyConstraint('pk_collection_items', ['collection_id', 'group_jid']) // Prevent duplicates
                .execute();

            console.log('[DB] Schema verified successfully (scheduled_messages rebuilt).');
        });
    } catch (err) {
        console.error('[DB] Failed to initialize tables:', err);
        throw err;
    }
}