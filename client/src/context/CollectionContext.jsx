// client/src/context/CollectionContext.jsx

import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import { getAllGroups } from '../services/groupService';
import {
    getAllCollections,
    saveCollection,
    deleteCollection,
    getCollectionDetails
} from '../services/collectionService';
import { logger } from '../lib/logger';

// 1. Create the Context
const CollectionContext = createContext();

// 2. Custom Hook to use the Context
export const useCollection = () => useContext(CollectionContext);

// 3. Provider Component
export const CollectionProvider = ({ children }) => {
    // --- Data State ---
    const [groups, setGroups] = useState([]);
    const [collections, setCollections] = useState([]);
    const [loadingData, setLoadingData] = useState(true);
    const [groupLoadError, setGroupLoadError] = useState(false);

    // --- Form/View State ---
    const [viewMode, setViewMode] = useState('idle'); 
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

    // --- Actions ---

    const fetchInitialData = async () => {
        setLoadingData(true);
        // We use Promise.allSettled to ensure one failure doesn't block the other
        const [groupsResult, colsResult] = await Promise.allSettled([
            getAllGroups(),
            getAllCollections()
        ]);

        // Handle Groups
        if (groupsResult.status === 'fulfilled') {
            setGroups(groupsResult.value);
            setGroupLoadError(false);
        } else {
            logger.error('Failed to load groups:', groupsResult.reason);
            setGroupLoadError(true);
            toast.error('Failed to load groups list.');
        }

        // Handle Collections
        if (colsResult.status === 'fulfilled') {
            setCollections(colsResult.value);
        } else {
            logger.error('Failed to load collections:', colsResult.reason);
            toast.error('Failed to load collections.');
        }

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
        try {
            // New Pattern: If this fails, it throws immediately
            const data = await getCollectionDetails(col.id);
            
            setEditId(col.id);
            setName(data.name);
            
            // Map the nested group objects to just JIDs for the set
            const jids = (data.groups || []).map(g => g.jid);
            setSelectedJids(new Set(jids));
            
            setViewMode('edit');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (error) {
            toast.error(error.message || 'Could not load collection details');
        } finally {
            setLoadingDetails(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this collection?')) return;
        
        // Optimistic UI Update (optional, but nice)
        const previousCollections = [...collections];
        setCollections(prev => prev.filter(c => c.id !== id));

        try {
            await deleteCollection(id);
            toast.success('Deleted.');
            
            if (editId === id) setViewMode('idle');
        } catch (error) {
            // Revert on failure
            setCollections(previousCollections);
            toast.error(error.message);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        
        // Client-side validation
        if (!name.trim()) {
            return toast.error('Collection name is required.');
        }
        if (selectedJids.size === 0) {
            return toast.error('Please select at least one group.');
        }

        setSubmitting(true);
        try {
            const payload = { 
                name, 
                groupJids: Array.from(selectedJids) 
            };
            
            await saveCollection(payload, editId);
            
            toast.success(editId ? 'Collection updated!' : 'Collection created!');
            setViewMode('idle');
            
            // Refresh list to see changes (like item_count updates)
            const updatedCols = await getAllCollections();
            setCollections(updatedCols);
            
        } catch (error) {
            toast.error(error.message);
        } finally {
            setSubmitting(false);
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