// server/src/db/schedule.dao.js

import { db } from '#db';
import { MESSAGE_STATUS } from '#types/enums';
import { DateTime } from 'luxon';
import { CONFIG } from '#config';

export const scheduleDAO = {

    /**
     * Inserts a new scheduled message into the database.
     * @param {number} collectionId 
     * @param {string} content 
     * @param {DateTime} scheduledAt - Luxon DateTime Object
     * @param {string} userId 
     */
    async createSchedule(collectionId, content, scheduledAt, userId) {
        // Convert Luxon object to UTC ISO string for Database storage
        const isoString = scheduledAt.toUTC().toISO();

        const result = await db.insertInto('scheduled_messages')
            .values({
                collection_id: collectionId,
                content,
                scheduled_at: isoString,
                status: MESSAGE_STATUS.PENDING,
                user_id: userId
            })
            .returningAll()
            .executeTakeFirstOrThrow();

        // Convert the stored UTC string back to a Luxon DateTime in the app's timezone
        return {
            ...result,
            scheduled_at: DateTime.fromISO(result.scheduled_at, { zone: CONFIG.TIMEZONE })
        };
    },

    /**
     * Resets jobs that were interrupted (IN_PROGRESS) back to PENDING 
     * so they are picked up by the restoration logic.
     */
    async resetStuckJobs() {
        const result = await db.updateTable('scheduled_messages')
            .set({ status: MESSAGE_STATUS.PENDING })
            .where('status', '=', MESSAGE_STATUS.IN_PROGRESS)
            .execute();

        if (result.length > 0 && result[0].numUpdatedRows > 0) {
            console.log(`[DAO] Reset ${result[0].numUpdatedRows} stuck jobs to PENDING.`);
        }
    },

    /**
     * Fetches all scheduled messages for job restoration.
     * @returns {Promise<Object[]>} List of scheduled messages, with Luxon DateTime objects.
     */
    async getPendingSchedules() {
        const rows = await db.selectFrom('scheduled_messages')
            .where('status', '=', MESSAGE_STATUS.PENDING)
            .selectAll()
            .execute();

        return rows.map(row => ({
            ...row,
            scheduled_at: DateTime.fromISO(row.scheduled_at, { zone: CONFIG.TIMEZONE })
        }));
    },

    /**
     * Fetches all scheduled messages... for a specific user.
     */
    async getSchedulesByUserId(userId) {
        const rows = await db.selectFrom('scheduled_messages as sm')
            .innerJoin('collections as c', 'c.id', 'sm.collection_id')
            .where('sm.user_id', '=', userId)
            .select([
                'sm.id',
                'sm.content',
                'sm.scheduled_at',
                'sm.status',
                'sm.created_at',
                'sm.collection_id',
                'c.name as collection_name'
            ])
            .orderBy('sm.scheduled_at', 'desc')
            .execute();

        return rows.map(row => ({
            ...row,
            scheduled_at: DateTime.fromISO(row.scheduled_at, { zone: CONFIG.TIMEZONE }),
            created_at: DateTime.fromISO(row.created_at, { zone: CONFIG.TIMEZONE })
        }));
    },

    /**
     * Updates the status of a scheduled message.
     * @param {number} id - Schedule ID.
     * @param {MESSAGE_STATUS} status - New status.
     */
    async updateScheduleStatus(id, status) {
        await db.updateTable('scheduled_messages')
            .set({ status })
            .where('id', '=', id)
            .execute();
    },

    /**
     * Deletes/Cancels a scheduled message by setting its status to 'DELETED'.
     * This is a soft delete operation.
     * @param {number} id - Schedule ID.
     */
    async deleteSchedule(id) {
        try {
            await db.updateTable('scheduled_messages')
                .set({
                    status: MESSAGE_STATUS.DELETED,
                    // Optional: Add a timestamp for auditability
                    // deleted_at: DateTime.now().toSQL() 
                })
                .where('id', '=', id)
                .execute();
        } catch (error) {
            logger.error(`[DB] Failed to soft-delete schedule ID ${id}:`, error);
            throw error;
        }
    }
}