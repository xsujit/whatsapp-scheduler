// server/src/db/schedule.dao.js

import { db } from './index.js';
import { sql } from 'kysely';
import { DateTime } from 'luxon';
import { CONFIG } from '#config';
import { MESSAGE_STATUS } from '#types/enums';

// --- MAPPERS ---

const mapScheduleToDomain = (row) => {
    if (!row) return null;
    return {
        ...row,
        scheduled_at: row.scheduled_at
            ? DateTime.fromISO(row.scheduled_at, { zone: CONFIG.TIMEZONE })
            : null,
        created_at: row.created_at
            ? DateTime.fromISO(row.created_at, { zone: CONFIG.TIMEZONE })
            : null,
    };
};

const mapItemToDomain = (row) => {
    if (!row) return null;
    return {
        ...row,
        sent_at: row.sent_at
            ? DateTime.fromISO(row.sent_at, { zone: CONFIG.TIMEZONE })
            : null,
        deleted_at: row.deleted_at
            ? DateTime.fromISO(row.deleted_at, { zone: CONFIG.TIMEZONE })
            : null,
    };
};

export const scheduleDAO = {

    // --- DEFINITIONS (Recurring Rules) ---

    async createDefinition({ content, userId, collectionId, hour, minute }) {
        return await db.insertInto('schedule_definitions')
            .values({ content, user_id: userId, collection_id: collectionId, hour, minute })
            .returningAll()
            .executeTakeFirstOrThrow();
    },

    async getAllDefinitions() {
        return await db.selectFrom('schedule_definitions').selectAll().execute();
    },

    async getDefinitions() {
        return await db.selectFrom('schedule_definitions')
            .where('is_active', '=', 1)
            .selectAll()
            .execute();
    },

    async getDefinitionsByUserId(userId) {
        return await db.selectFrom('schedule_definitions')
            .where('user_id', '=', userId)
            .where('is_active', '=', 1)
            .selectAll()
            .execute();
    },

    async deleteDefinition(id) {
        return await db.deleteFrom('schedule_definitions')
            .where('id', '=', id)
            .execute();
    },

    async deactivateDefinition(id) {
        return await db.updateTable('schedule_definitions')
            .set({ is_active: 0 })
            .where('id', '=', id)
            .execute();
    },

    // --- EXECUTIONS (The Core Logic) ---

    /**
     * Transactionally creates the Header and Items.
     * Returns domain objects with Luxon dates for BOTH.
     */
    async createScheduleWithItems(content, scheduledAt, userId, groupJids, definitionId = null) {
        return await db.transaction().execute(async (trx) => {
            // 1. Create Header
            const headerRow = await trx.insertInto('scheduled_messages')
                .values({
                    content,
                    scheduled_at: scheduledAt.toUTC().toISO(),
                    user_id: userId,
                    definition_id: definitionId
                })
                .returningAll()
                .executeTakeFirstOrThrow();

            // 2. Create Items
            let items = [];
            if (groupJids.length > 0) {
                const itemValues = groupJids.map(jid => ({
                    scheduled_message_id: headerRow.id,
                    group_jid: jid,
                    status: MESSAGE_STATUS.PENDING
                }));

                const itemRows = await trx.insertInto('scheduled_message_items')
                    .values(itemValues)
                    .returningAll()
                    .execute();

                // Map raw DB rows to Luxon objects
                items = itemRows.map(mapItemToDomain);
            }

            // 3. Return Combined Domain Object
            return {
                ...mapScheduleToDomain(headerRow),
                items: items
            };
        });
    },

    /**
     * Fetches a header and its pending items.
     */
    async getScheduleWithPendingItems(scheduleId) {
        const headerRow = await db.selectFrom('scheduled_messages')
            .where('id', '=', scheduleId)
            .where('deleted_at', 'is', null)
            .selectAll()
            .executeTakeFirst();

        if (!headerRow) return null;

        const itemRows = await db.selectFrom('scheduled_message_items')
            .where('scheduled_message_id', '=', scheduleId)
            .where('status', '=', MESSAGE_STATUS.PENDING)
            .where('deleted_at', 'is', null)
            .selectAll()
            .execute();

        return {
            ...mapScheduleToDomain(headerRow),
            items: itemRows.map(mapItemToDomain)
        };
    },

    async getSchedulesByUserId(userId) {
        const rows = await db.selectFrom('scheduled_messages as sm')
            .where('sm.user_id', '=', userId)
            .where('sm.deleted_at', 'is', null)
            .leftJoin('scheduled_message_items as smi', (join) =>
                join.onRef('smi.scheduled_message_id', '=', 'sm.id')
                    .on('smi.deleted_at', 'is', null)
            )
            .select([
                'sm.id', 'sm.content', 'sm.scheduled_at', 'sm.created_at', 'sm.definition_id',
                db.fn.count('smi.id').as('total_count'),
                sql`SUM(CASE WHEN smi.status = ${MESSAGE_STATUS.SENT} THEN 1 ELSE 0 END)`.as('sent_count'),
                sql`SUM(CASE WHEN smi.status = ${MESSAGE_STATUS.FAILED} THEN 1 ELSE 0 END)`.as('failed_count'),
                sql`SUM(CASE WHEN smi.status = ${MESSAGE_STATUS.PENDING} THEN 1 ELSE 0 END)`.as('pending_count'),
            ])
            .groupBy(['sm.id', 'sm.content', 'sm.scheduled_at', 'sm.created_at', 'sm.definition_id'])
            .orderBy('sm.scheduled_at', 'desc')
            .execute();

        return rows.map(mapScheduleToDomain);
    },

    /**
     * Updates the status of a specific item.
     */
    async updateItemStatus(itemId, status, errorMessage = null) {
        await db.updateTable('scheduled_message_items')
            .set({
                status,
                sent_at: status === MESSAGE_STATUS.SENT ? sql`CURRENT_TIMESTAMP` : null,
                error_message: errorMessage
            })
            .where('id', '=', itemId)
            .execute();
    },

    /**
     * Finds all schedules that still have at least one PENDING item.
     */
    async getSchedulesWithPendingItems() {
        const rows = await db.selectFrom('scheduled_messages as sm')
            .where(({ exists, selectFrom }) => exists(
                selectFrom('scheduled_message_items')
                    .select(sql`1`)
                    .whereRef('scheduled_message_id', '=', 'sm.id')
                    .where('status', '=', MESSAGE_STATUS.PENDING)
                    .where('deleted_at', 'is', null)
            ))
            .where('sm.deleted_at', 'is', null)
            .selectAll()
            .execute();

        return rows.map(mapScheduleToDomain);
    },

    async deactivateSchedule(id) {
        // Soft delete the scheduled_message
        const scheduleResult = await db.updateTable('scheduled_messages')
            .set({ deleted_at: sql`CURRENT_TIMESTAMP` })
            .where('id', '=', id)
            .executeTakeFirst();

        const itemsResult = await db.updateTable('scheduled_message_items')
            .set({ deleted_at: sql`CURRENT_TIMESTAMP` })
            .where('scheduled_message_id', '=', id)
            .execute();

        // Return the number of deleted schedules (should be 1 if found)
        return {
            scheduledMessages: scheduleResult,
            scheduledMessageItems: itemsResult
        };
    }
};