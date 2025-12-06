// client/src/context/CollectionContext.jsx

import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { getAllGroups } from '../services/groupService';
import {
    getAllCollections,
    saveCollection,
    deleteCollection,
    getCollectionDetails
} from '../services/collectionService';
import toast from 'react-hot-toast';

// 1. Create the Context
const CollectionContext = createContext();

// 2. Custom Hook to use the Context
export const useCollection = () => {
    return useContext(CollectionContext);
};

// 3. Provider Component
export const CollectionProvider = ({ children }) => {
    // --- Data State (Initial Load) ---
    const [groups, setGroups] = useState([]);
    const [collections, setCollections] = useState([]);
    const [loadingData, setLoadingData] = useState(true);
    const [groupLoadError, setGroupLoadError] = useState(false);

    // --- Form/View State ---
    const [viewMode, setViewMode] = useState('idle'); // 'idle', 'create', 'edit'
    const [editId, setEditId] = useState(null);
    const [loadingDetails, setLoadingDetails] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // --- Form Inputs ---
    const [name, setName] = useState('');
    const [selectedJids, setSelectedJids] = useState(new Set());

    // --- Effects ---
    useEffect(() => {
        fetchInitialData();
    }, []);

    // --- Handlers/Actions ---

    const fetchInitialData = async () => {
        setLoadingData(true);
        const [groupsRes, colsRes] = await Promise.all([getAllGroups(), getAllCollections()]);

        if (groupsRes.success) setGroups(groupsRes.data);
        else setGroupLoadError(true);

        if (colsRes.success) setCollections(colsRes.data);
        setLoadingData(false);
    };

    const handleCreate = () => {
        setName('');
        setSelectedJids(new Set());
        setEditId(null);
        setViewMode('create');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleEdit = async (col) => {
        setLoadingDetails(true);
        const res = await getCollectionDetails(col.id);
        setLoadingDetails(false);

        if (res.success) {
            setEditId(col.id);
            setName(res.data.name);
            const jids = (res.data.groups || []).map(g => g.jid);
            setSelectedJids(new Set(jids));
            setViewMode('edit');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            toast.error('Failed to load collection details.');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this collection?')) return;
        const res = await deleteCollection(id);
        if (res.success) {
            toast.success('Deleted.');
            fetchInitialData();
            if (editId === id) setViewMode('idle');
        } else {
            toast.error(res.error);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!name || selectedJids.size === 0) {
            toast.error('Name and at least one group required.');
            return;
        }

        setSubmitting(true);
        const payload = { name, groupJids: Array.from(selectedJids) };
        const res = await saveCollection(payload, editId);
        setSubmitting(false);

        if (res.success) {
            toast.success(editId ? 'Updated!' : 'Created!');
            setViewMode('idle');
            fetchInitialData();
        } else {
            toast.error(res.error);
        }
    };

    const handleToggleGroup = (jid) => {
        const next = new Set(selectedJids);
        if (next.has(jid)) next.delete(jid);
        else next.add(jid);
        setSelectedJids(next);
    };

    const handleCancel = () => setViewMode('idle');

    // Combine all values into a single object for the context value
    const contextValue = useMemo(() => ({
        // Data
        groups,
        collections,
        loadingData,
        groupLoadError,

        // Form/View State
        viewMode,
        editId,
        loadingDetails,
        submitting,

        // Form Inputs
        name,
        selectedJids,
        setName,

        // Handlers/Actions
        handleCreate,
        handleEdit,
        handleDelete,
        handleSave,
        handleToggleGroup,
        handleCancel,
    }), [
        groups, collections, loadingData, groupLoadError,
        viewMode, editId, loadingDetails, submitting,
        name, selectedJids
    ]);

    return (
        <CollectionContext.Provider value={contextValue}>
            {children}
        </CollectionContext.Provider>
    );
};