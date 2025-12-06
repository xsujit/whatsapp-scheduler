// server/src/services/group.service.js

import { db } from '#db';

export const groupService = {

    /**
     * Takes raw group metadata from Baileys and upserts it into the DB.
     * @param {Object} waGroups - Dictionary of groups from Baileys
     */
    async syncGroups(waGroups) {
        // 1. Transform Baileys object to DB Row format
        const groups = Object.values(waGroups).map(g => ({
            jid: g.id,
            name: g.subject || 'Unknown Group'
        }));

        if (groups.length === 0) return 0;

        // 2. Perform Upsert (Insert, or Update name if JID exists)
        await db.insertInto('groups')
            .values(groups)
            .onConflict((oc) => oc
                .column('jid')
                .doUpdateSet((eb) => ({
                    name: eb.ref('excluded.name') // Update name in case it changed on WA
                }))
            )
            .execute();

        return groups.length;
    },

    /**
     * Fetch all groups (Useful for the future UI)
     */
    async getAllGroups() {
        return await db.selectFrom('groups')
            .selectAll()
            .orderBy('name', 'asc')
            .execute();
    }
};