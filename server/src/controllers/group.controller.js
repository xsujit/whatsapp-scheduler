// server/src/controllers/group.controller.js

import { groupService } from '#services/group.service';
import { asyncHandler } from '#utils/asyncHandler';

/**
 * @route GET /api/groups
 * @description Fetches the list of all available groups from the database.
 */
export const getAllGroups = asyncHandler(async (req, res) => {
    const groups = await groupService.getAllGroups();
    res.json(groups);
});