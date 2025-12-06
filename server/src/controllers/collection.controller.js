// server/src/controllers/collection.controller.js

import { collectionDAO } from '#db/collection.dao';
import { validateCollectionData } from '#lib/validation/collection.schema';
import { APIError } from 'better-auth/api';

/**
 * @route GET /api/collections
 * @description Fetches a summary list of all collections.
 */
export const getAllCollections = async (req, res) => {
    try {
        const collections = await collectionDAO.getAllCollectionsSummary();
        res.json(collections);
    } catch (error) {
        console.error('[Controller] Failed to fetch collections:', error);
        res.status(500).json({ error: 'Failed to retrieve collections list.' });
    }
};

/**
 * @route GET /api/collections/:id
 * @description Fetches a single collection with its mapped groups.
 */
export const getCollectionDetails = async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) {
            return res.status(400).json({ error: 'Invalid collection ID.' });
        }

        const collection = await collectionDAO.getCollectionDetails(id);

        if (!collection) {
            return res.status(404).json({ error: 'Collection not found.' });
        }

        res.json(collection);
    } catch (error) {
        console.error('[Controller] Failed to fetch collection details:', error);
        res.status(500).json({ error: 'Failed to retrieve collection details.' });
    }
};

/**
 * @route POST /api/collections
 * @route PUT /api/collections/:id
 * @description Creates or updates a collection and its group mappings.
 */
export const saveCollection = async (req, res) => {
    try {
        const { name, groupJids } = validateCollectionData(req.body);
        let id = undefined;

        if (req.params.id) {
            id = parseInt(req.params.id, 10);
            if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' });
        }

        if (id && isNaN(id)) {
            return res.status(400).json({ error: 'Invalid collection ID provided for update.' });
        }

        const savedCollection = await collectionDAO.saveCollection(id, name, groupJids);

        // Respond with 201 Created for new collection, 200 OK for update
        const status = id ? 200 : 201;
        res.status(status).json(savedCollection);

    } catch (error) {
        if (error instanceof APIError) {
            return res.status(error.statusCode).json({ error: error.message });
        }
        console.error('[Controller] Failed to save collection:', error);
        res.status(500).json({ error: 'Failed to save collection due to a server error.' });
    }
};

/**
 * @route DELETE /api/collections/:id
 * @description Deletes a collection.
 */
export const deleteCollection = async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) {
            return res.status(400).json({ error: 'Invalid collection ID.' });
        }

        await collectionDAO.deleteCollection(id);
        res.status(204).send(); // 204 No Content for successful deletion

    } catch (error) {
        console.error('[Controller] Failed to delete collection:', error);
        res.status(500).json({ error: 'Failed to delete collection.' });
    }
};