// server/src/db/index.js

import Database from 'better-sqlite3';
import { Kysely, SqliteDialect, sql } from 'kysely';
import { MESSAGE_STATUS, MESSAGE_STATUS_VALUES } from '#types/enums';
import { logger } from '#lib/logger';

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
        logger.info({ context: 'db' }, 'Checking Schema...');

        await db.transaction().execute(async (trx) => {
            // DROP TABLES (Clean Slate)
            if (process.env.DROP_SCHEDULED_MESSAGES === 'true') {
                logger.warn({ context: 'db' }, 'Dropping Schedule Tables (DROP_SCHEDULED_MESSAGES=true)');
                await trx.schema.dropTable('scheduled_message_items').ifExists().execute();
                await trx.schema.dropTable('scheduled_messages').ifExists().execute();
                await trx.schema.dropTable('schedule_definitions').ifExists().execute();
            }

            // --- 1. Schedule Definitions ---
            await trx.schema
                .createTable('schedule_definitions')
                .ifNotExists()
                .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
                .addColumn('content', 'text', (col) => col.notNull())
                .addColumn('user_id', 'text', (col) => col.notNull())
                .addColumn('collection_id', 'integer', (col) => col.notNull().references('collections.id').onDelete('cascade'))
                .addColumn('hour', 'integer', (col) => col.notNull())
                .addColumn('minute', 'integer', (col) => col.notNull())
                .addColumn('is_active', 'integer', (col) => col.defaultTo(1))
                .addColumn('created_at', 'text', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`))
                .execute();

            // --- 2. Scheduled Messages ---
            await trx.schema
                .createTable('scheduled_messages')
                .ifNotExists()
                .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
                .addColumn('content', 'text', (col) => col.notNull())
                .addColumn('scheduled_at', 'text', (col) => col.notNull())
                .addColumn('user_id', 'text', (col) => col.notNull())
                .addColumn('definition_id', 'integer', (col) => col.references('schedule_definitions.id').onDelete('set null'))
                .addColumn('created_at', 'text', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`))
                .addColumn('deleted_at', 'text')
                .execute();

            // --- 3. Scheduled Message Items ---
            await trx.schema
                .createTable('scheduled_message_items')
                .ifNotExists()
                .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
                .addColumn('scheduled_message_id', 'integer', (col) => col.notNull().references('scheduled_messages.id').onDelete('cascade'))
                .addColumn('group_jid', 'text', (col) => col.notNull())
                .addColumn('status', 'text', (col) => col.notNull().defaultTo(MESSAGE_STATUS.PENDING).check(sql`status IN (${sql.raw(quotedStatusList)})`))
                .addColumn('sent_at', 'text')
                .addColumn('error_message', 'text')
                .addColumn('deleted_at', 'text')
                .execute();

            // --- Groups & Collections ---
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

            logger.info({ context: 'db' }, 'Schema verification complete');
        });
    } catch (err) {
        logger.fatal({ err, context: 'db' }, 'Failed to initialize database tables');
        throw err;
    }
}