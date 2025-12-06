// server/src/controllers/group.controller.js

import { groupService } from '#services/group.service';

/**
 * @route GET /api/groups
 * @description Fetches the list of all available groups from the database.
 */
export const getAllGroups = async (req, res) => {
    try {
        const groups = await groupService.getAllGroups();
        res.json(groups);
    } catch (error) {
        console.error('[Controller] Failed to fetch groups:', error);
        res.status(500).json({ error: 'Failed to retrieve groups.' });
    }
};