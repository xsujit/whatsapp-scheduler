// server/src/controllers/collection.controller.js

import { collectionDAO } from '#db/collection.dao';
import { validateCollectionData } from '#lib/validation/collection.schema';
import { asyncHandler } from '#utils/asyncHandler';
import { AppError } from '#lib/errors/AppError';

/**
 * @route GET /api/collections
 * @description Fetches a summary list of all collections.
 */
export const getAllCollections = asyncHandler(async (req, res) => {
    const collections = await collectionDAO.getAllCollectionsSummary();
    res.json(collections);
});

/**
 * @route GET /api/collections/:id
 * @description Fetches a single collection with its mapped groups.
 */
export const getCollectionDetails = asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
        throw new AppError('Invalid collection ID.', 400);
    }

    const collection = await collectionDAO.getCollectionDetails(id);

    if (!collection) {
        throw new AppError('Collection not found.', 404);
    }

    res.json(collection);
});

/**
 * @route POST /api/collections
 * @route PUT /api/collections/:id
 * @description Creates or updates a collection and its group mappings.
 */
export const saveCollection = asyncHandler(async (req, res) => {
    const { name, groupJids } = validateCollectionData(req.body);

    let id = undefined;
    if (req.params.id) {
        id = parseInt(req.params.id, 10);
        if (isNaN(id)) {
            throw new AppError('Invalid collection ID.', 400);
        }
    }

    const savedCollection = await collectionDAO.saveCollection(id, name, groupJids);

    const status = id ? 200 : 201;
    res.status(status).json(savedCollection);
});

/**
 * @route DELETE /api/collections/:id
 * @description Deletes a collection.
 */
export const deleteCollection = asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
        throw new AppError('Invalid collection ID.', 400);
    }

    const exists = await collectionDAO.getCollectionDetails(id);
    if (!exists) {
        throw new AppError('Collection not found.', 404);
    }

    await collectionDAO.deleteCollection(id);

    // 204 No Content (standard for delete)
    res.status(204).send();
});