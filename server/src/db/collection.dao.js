// server/src/db/collection.dao.js

import { db } from '#db';
import { DateTime } from 'luxon';
import { CONFIG } from '#config';

export const collectionDAO = {

    /**
     * Creates a new Collection or updates an existing one, handling the associated group mappings transactionally.
     * @param {number | undefined} id - Collection ID (undefined for creation, number for update)
     * @param {string} name - Name of the collection
     * @param {string[]} groupJids - Array of group JIDs to map to this collection
     * @returns {Promise<Object>} The inserted/updated collection object
     */
    async saveCollection(id, name, groupJids) {
        return await db.transaction().execute(async (trx) => {
            let collectionId = id;

            // 1. Insert or Update
            if (id) {
                await trx.updateTable('collections')
                    .set({ name })
                    .where('id', '=', id)
                    .execute();
                collectionId = id;
            } else {
                const result = await trx.insertInto('collections')
                    .values({ name })
                    .returning('id')
                    .executeTakeFirstOrThrow();
                collectionId = result.id;
            }

            // 2. Clear existing mappings (if updating)
            if (id) {
                await trx.deleteFrom('collection_items')
                    .where('collection_id', '=', collectionId)
                    .execute();
            }

            // 3. Insert new mappings
            if (groupJids && groupJids.length > 0) {
                // Prepare items for batch insert
                const items = groupJids.map(jid => ({
                    collection_id: collectionId,
                    group_jid: jid
                }));

                // Perform batch insert
                await trx.insertInto('collection_items')
                    .values(items)
                    .execute();
            }

            // 4. Return the resulting collection details
            return { id: collectionId, name, groupJids };
        });
    },

    /**
     * Fetches all collections with a count of the groups in each.
     */
    async getAllCollectionsSummary() {
        // SQL to count groups per collection
        const groupCount = db.selectFrom('collection_items')
            .select(({ fn }) => fn.count('group_jid').as('item_count'))
            .whereRef('collection_id', '=', 'collections.id')
            .as('groupCount');

        const rows = await db.selectFrom('collections')
            .select(['id', 'name', 'created_at', groupCount])
            .orderBy('name', 'asc')
            .execute();

        return rows.map(row => ({
            ...row,
            created_at: row.created_at ? DateTime.fromISO(row.created_at, { zone: CONFIG.TIMEZONE }) : null
        }));
    },

    /**
     * Fetches a single collection and all its mapped groups.
     * @param {number} id - Collection ID
     */
    async getCollectionDetails(id) {
        // 1. Fetch Collection Header
        const collection = await db.selectFrom('collections')
            .where('id', '=', id)
            .selectAll()
            .executeTakeFirst();

        if (!collection) return null;

        // 2. Fetch Mapped Groups
        const groups = await db.selectFrom('collection_items')
            .innerJoin('groups', 'groups.jid', 'collection_items.group_jid')
            .where('collection_items.collection_id', '=', id)
            .select(['groups.jid', 'groups.name'])
            .orderBy('groups.name', 'asc')
            .execute();

        return {
            ...collection,
            // Convert created_at to Luxon DateTime
            created_at: collection.created_at ? DateTime.fromISO(collection.created_at, { zone: CONFIG.TIMEZONE }) : null,
            groups: groups
        };
    },

    async getCollectionItems(collectionId) {
        return await db.selectFrom('collection_items')
            .where('collection_id', '=', collectionId)
            .select('group_jid')
            .execute();
    },

    /**
     * Deletes a collection and its associated group mappings (cascaded by FK).
     * @param {number} id - Collection ID
     */
    async deleteCollection(id) {
        await db.deleteFrom('collections')
            .where('id', '=', id)
            .execute();
    }
};