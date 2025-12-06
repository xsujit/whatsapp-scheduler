// client/src/services/collectionService.js

const BASE_URL = '/api/collections';

export const getCollectionDetails = async (id) => {
    try {
        const response = await fetch(`${BASE_URL}/${id}`);
        if (!response.ok) throw new Error('Failed to fetch collection details');
        const data = await response.json();
        return { success: true, data: data || null };
    } catch (error) {
        return { success: false, error: error.message, data: null };
    }
};

export const getAllCollections = async () => {
    try {
        const response = await fetch(BASE_URL);
        if (!response.ok) throw new Error('Failed to fetch collections');
        const data = await response.json();
        return { success: true, data: data || [] };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

export const saveCollection = async (collectionData, id = null) => {
    try {
        const url = id ? `${BASE_URL}/${id}` : BASE_URL;
        const method = id ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(collectionData),
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to save collection');

        return { success: true, data };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

export const deleteCollection = async (id) => {
    try {
        const response = await fetch(`${BASE_URL}/${id}`, { method: 'DELETE' });
        if (!response.ok) throw new Error('Failed to delete collection');
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
};