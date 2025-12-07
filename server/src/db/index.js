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

            // DROP TABLES if requested (Clean Slate Strategy)
            if (process.env.DROP_SCHEDULED_MESSAGES === 'true') {
                console.warn('[DB] Dropping Schedule Tables...');
                await trx.schema.dropTable('scheduled_message_items').ifExists().execute();
                await trx.schema.dropTable('scheduled_messages').ifExists().execute();
                await trx.schema.dropTable('schedule_definitions').ifExists().execute();
            }

            // --- 1. Schedule Definitions (THE PARENT / RULE) ---
            // Stores "I want to send X every day at Y time"
            await trx.schema
                .createTable('schedule_definitions')
                .ifNotExists()
                .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
                .addColumn('content', 'text', (col) => col.notNull())
                .addColumn('user_id', 'text', (col) => col.notNull())
                .addColumn('collection_id', 'integer', (col) => col.notNull().references('collections.id').onDelete('cascade'))
                .addColumn('hour', 'integer', (col) => col.notNull())
                .addColumn('minute', 'integer', (col) => col.notNull())
                .addColumn('is_active', 'integer', (col) => col.defaultTo(1)) // 1 = true, 0 = false
                .addColumn('created_at', 'text', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`))
                .execute();

            // --- 2. Scheduled Messages (THE CHILD / EXECUTION) ---
            // Stores specific instances of messages to be sent (or already sent)
            await trx.schema
                .createTable('scheduled_messages')
                .ifNotExists()
                .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
                .addColumn('content', 'text', (col) => col.notNull())
                .addColumn('scheduled_at', 'text', (col) => col.notNull())
                .addColumn('user_id', 'text', (col) => col.notNull())
                // Link back to definition (optional, because one-off messages won't have a parent)
                .addColumn('definition_id', 'integer', (col) => col.references('schedule_definitions.id').onDelete('set null'))
                .addColumn('created_at', 'text', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`))
                .addColumn('deleted_at', 'text')
                .execute();

            // --- 3. Scheduled Message Items (THE TARGETS) ---
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
                .addColumn('sent_at', 'text')
                .addColumn('error_message', 'text')
                .addColumn('deleted_at', 'text')
                .execute();

            // ... (Groups, Collections, Collection Items schemas remain unchanged) ...
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