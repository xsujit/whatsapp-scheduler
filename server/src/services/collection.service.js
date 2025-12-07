// server/src/services/collection.service.js

import { collectionDAO } from '#db/collection.dao';

export const collectionService = {

    async getGroupJids(collectionId) {
        const collectionItems = await collectionDAO.getCollectionItems(collectionId);
        return collectionItems.map(c => c.group_jid);;
    },

};