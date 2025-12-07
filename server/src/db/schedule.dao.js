// server/src/db/schedule.dao.js

import { db } from './index.js';
import { sql } from 'kysely';
import { DateTime } from 'luxon';
import { CONFIG } from '#config';
import { MESSAGE_STATUS } from '#types/enums';

// Helper to convert DB Row to Domain Object (Luxon)
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

export const scheduleDAO = {

    /**
     * Creates a schedule header and snapshots the current collection members as items.
     * Returns: Object with Luxon DateTime dates.
     */
    async createScheduleWithItems(content, scheduledAt, userId, groupJids) {
        return await db.transaction().execute(async (trx) => {
            // 1. Create Header
            // We convert Luxon -> ISO String for storage
            const result = await trx.insertInto('scheduled_messages')
                .values({
                    content,
                    scheduled_at: scheduledAt.toUTC().toISO(),
                    user_id: userId
                })
                .returningAll()
                .executeTakeFirstOrThrow();

            // 2. Create Items (Snapshot)
            if (groupJids.length > 0) {
                const items = groupJids.map(jid => ({
                    scheduled_message_id: result.id,
                    group_jid: jid,
                    status: MESSAGE_STATUS.PENDING
                }));

                await trx.insertInto('scheduled_message_items')
                    .values(items)
                    .execute();
            }

            // 3. Hydrate and Return
            // We add the itemCount for convenience, and use the helper to convert dates
            return {
                ...mapScheduleToDomain(result),
                itemCount: groupJids.length
            };
        });
    },

    /**
     * Get schedules with a summary of their items' status.
     */
    async getSchedulesByUserId(userId) {
        const rows = await db.selectFrom('scheduled_messages as sm')
            .where('sm.user_id', '=', userId)
            .leftJoin('scheduled_message_items as smi', 'smi.scheduled_message_id', 'sm.id')
            .select([
                'sm.id',
                'sm.content',
                'sm.scheduled_at',
                'sm.created_at',
                db.fn.count('smi.id').as('total_count'),
                // 4. Use conditional SUM to count specific statuses
                sql`SUM(CASE WHEN smi.status = ${MESSAGE_STATUS.SENT} THEN 1 ELSE 0 END)`.as('sent_count'),
                sql`SUM(CASE WHEN smi.status = ${MESSAGE_STATUS.FAILED} THEN 1 ELSE 0 END)`.as('failed_count'),
                sql`SUM(CASE WHEN smi.status = ${MESSAGE_STATUS.PENDING} THEN 1 ELSE 0 END)`.as('pending_count'),
            ])
            .groupBy([
                'sm.id',
                'sm.content',
                'sm.scheduled_at',
                'sm.created_at',
            ])
            .orderBy('sm.scheduled_at', 'desc')
            .execute();

        // Convert all rows to use Luxon
        return rows.map(mapScheduleToDomain);
    },

    /**
     * Gets all items for a specific schedule that are still PENDING.
     * Note: Items don't usually have dates, but if 'sent_at' exists, we should map it too.
     */
    async getPendingItems(scheduleId) {
        const rows = await db.selectFrom('scheduled_message_items')
            .where('scheduled_message_id', '=', scheduleId)
            .where('status', '=', MESSAGE_STATUS.PENDING)
            .selectAll()
            .execute();

        // If items have date fields (like sent_at), map them here. 
        // For now, raw return is fine as 'sent_at' is null for pending items.
        return rows;
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
     * Used by restoreJobs()
     * Finds all schedules that still have at least one PENDING item.
     */
    async getSchedulesWithPendingItems() {
        const rows = await db.selectFrom('scheduled_messages as sm')
            .where(({ exists, selectFrom }) => exists(
                selectFrom('scheduled_message_items')
                    .select(sql`1`)
                    .whereRef('scheduled_message_id', '=', 'sm.id')
                    .where('status', '=', MESSAGE_STATUS.PENDING)
            ))
            .selectAll()
            .execute();

        return rows.map(mapScheduleToDomain);
    },

    // TODO: Add .addColumn('deleted_at', 'text') to the schema.
    // Update the deleteSchedule DAO to update ... set deleted_at = CURRENT_TIMESTAMP.
    // Update the getSchedules DAO to where('deleted_at', 'is', null).
    async deleteSchedule(id) {
        return await db.deleteFrom('scheduled_messages')
            .where('id', '=', id)
            .execute();
    }
};