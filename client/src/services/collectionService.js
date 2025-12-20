// client/src/services/collectionService.js

import { api } from '../lib/api';

const BASE_URL = '/api/collections';

export const getCollectionDetails = (id) => api.get(`${BASE_URL}/${id}`);

export const getAllCollections = () => api.get(BASE_URL);

export const saveCollection = (data, id = null) => {
    if (id) {
        return api.put(`${BASE_URL}/${id}`, data);
    }
    return api.post(BASE_URL, data);
};

export const deleteCollection = (id) => api.delete(`${BASE_URL}/${id}`);