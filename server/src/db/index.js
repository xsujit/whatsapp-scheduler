// server/src/db/index.js

import Database from 'better-sqlite3';
import { Kysely, SqliteDialect, sql } from 'kysely';
import { MESSAGE_STATUS, MESSAGE_STATUS_VALUES } from '#types/enums';

const rawDb = new Database('app.db');
rawDb.pragma('journal_mode = WAL');
rawDb.pragma('foreign_keys = ON');

const quotedStatusList = MESSAGE_STATUS_VALUES.map(v => `'${v}'`).join(', ');

export const db = new Kysely({
    dialect: new SqliteDialect({
        database: rawDb,
    }),
});

export async function initializeSchema() {
    try {
        await db.transaction().execute(async (trx) => {
            console.log('[DB] Checking Schema...');

            // --- 1. Scheduled Messages (HEADER) ---
            // Stores "What" (content) and "When" (time), but not "Who" or "Status"
            if (process.env.DROP_SCHEDULED_MESSAGES === 'true') {
                 await trx.schema.dropTable('scheduled_message_items').ifExists().execute();
                 await trx.schema.dropTable('scheduled_messages').ifExists().execute();
            }

            await trx.schema
                .createTable('scheduled_messages')
                .ifNotExists()
                .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
                .addColumn('content', 'text', (col) => col.notNull())
                .addColumn('scheduled_at', 'text', (col) => col.notNull())
                .addColumn('user_id', 'text', (col) => col.notNull())
                .addColumn('created_at', 'text', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`))
                .execute();

            // --- 2. Scheduled Message Items (EXECUTION ROWS) ---
            // Stores the snapshot of targets at the moment of creation
            await trx.schema
                .createTable('scheduled_message_items')
                .ifNotExists()
                .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
                .addColumn('scheduled_message_id', 'integer', (col) => col.notNull()
                    .references('scheduled_messages.id').onDelete('cascade'))
                .addColumn('group_jid', 'text', (col) => col.notNull())
                .addColumn('status', 'text', (col) => col
                    .notNull()
                    .defaultTo(MESSAGE_STATUS.PENDING)
                    .check(sql`status IN (${sql.raw(quotedStatusList)})`))
                .addColumn('sent_at', 'text') // Nullable, populated on success
                .addColumn('error_message', 'text') // Nullable, populated on failure
                .execute();

            // --- 3. Groups & Collections (Existing - No Changes) ---
            await trx.schema.createTable('groups').ifNotExists()
                .addColumn('jid', 'text', (col) => col.primaryKey())
                .addColumn('name', 'text', (col) => col.notNull())
                .addColumn('created_at', 'text', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`))
                .execute();

            await trx.schema.createTable('collections').ifNotExists()
                .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
                .addColumn('name', 'text', (col) => col.notNull())
                .addColumn('created_at', 'text', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`))
                .execute();

            await trx.schema.createTable('collection_items').ifNotExists()
                .addColumn('collection_id', 'integer', (col) => col.notNull().references('collections.id').onDelete('cascade'))
                .addColumn('group_jid', 'text', (col) => col.notNull().references('groups.jid').onDelete('cascade'))
                .addPrimaryKeyConstraint('pk_collection_items', ['collection_id', 'group_jid'])
                .execute();

            console.log('[DB] Schema verified');
        });
    } catch (err) {
        console.error('[DB] Failed to initialize tables:', err);
        throw err;
    }
}