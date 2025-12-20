// client/src/context/ScheduleContext.jsx

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { getAllCollections } from '../services/collectionService';
import {
    getRecurringRules,
    deleteRecurringRule,
    createSchedule as apiCreateSchedule
} from '../services/scheduleService';
import { logger } from '../lib/logger';

const ScheduleContext = createContext();

export const useScheduleContext = () => {
    const context = useContext(ScheduleContext);
    if (!context) throw new Error('useScheduleContext must be used within a ScheduleProvider');
    return context;
};

export const ScheduleProvider = ({ children }) => {
    const [collections, setCollections] = useState([]);
    const [recurringRules, setRecurringRules] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // Initial Data Fetch
    const refreshData = useCallback(async () => {
        setIsLoading(true);

        // Use allSettled so one failure doesn't break the entire UI
        const [colsResult, rulesResult] = await Promise.allSettled([
            getAllCollections(),
            getRecurringRules()
        ]);

        // 1. Handle Collections
        if (colsResult.status === 'fulfilled') {
            setCollections(colsResult.value);
        } else {
            logger.error('Failed to load collections:', colsResult.reason);
            toast.error('Could not load collections');
        }

        // 2. Handle Rules
        if (rulesResult.status === 'fulfilled') {
            setRecurringRules(rulesResult.value);
        } else {
            logger.error('Failed to load rules:', rulesResult.reason);
        }

        setIsLoading(false);
    }, []);

    useEffect(() => {
        refreshData();
    }, [refreshData]);

    // Action: Create Schedule
    const createSchedule = async (payload) => {
        try {
            const result = await apiCreateSchedule(payload);

            toast.success(result.message || 'Schedule created successfully');

            // If it was a recurring rule, refresh the rules list
            if (payload.type === 'DAILY') {
                const rules = await getRecurringRules();
                setRecurringRules(rules);
            }

            return true; // Signal success to component (to close modal/reset form)
        } catch (error) {
            toast.error(error.message);
            return false; // Signal failure
        }
    };

    // Action: Delete Rule
    const deleteRule = async (id) => {
        if (!window.confirm("Are you sure you want to stop this daily schedule?")) return;

        // Optimistic UI Update: Remove it immediately
        const prevRules = [...recurringRules];
        setRecurringRules(prev => prev.filter(r => r.id !== id));

        try {
            await deleteRecurringRule(id);
            toast.success("Recurring schedule stopped.");
        } catch (error) {
            // Revert on failure
            setRecurringRules(prevRules);
            toast.error(error.message);
        }
    };

    const value = {
        collections,
        recurringRules,
        isLoading,
        createSchedule,
        deleteRule,
        refreshData // Exported in case other components need to trigger a refresh
    };

    return (
        <ScheduleContext.Provider value={value}>
            {children}
        </ScheduleContext.Provider>
    );
};