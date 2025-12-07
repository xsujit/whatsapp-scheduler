import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getAllCollections } from '../services/collectionService';
import { getRecurringRules, deleteRecurringRule, createSchedule as apiCreateSchedule } from '../services/scheduleService';
import toast from 'react-hot-toast';

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
        try {
            const [colsRes, rulesRes] = await Promise.all([
                getAllCollections(),
                getRecurringRules()
            ]);

            if (colsRes.success) setCollections(colsRes.data);
            if (rulesRes.success) setRecurringRules(rulesRes.data);

        } catch (err) {
            console.error(err);
            toast.error("Failed to load schedule data.");
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        refreshData();
    }, [refreshData]);

    // Action: Create Schedule
    const createSchedule = async (payload) => {
        const result = await apiCreateSchedule(payload);
        if (result.success) {
            toast.success(result.data.message || 'Schedule created successfully');
            // If it was a recurring rule, we need to refresh the list
            if (payload.type === 'DAILY') {
                const rulesRes = await getRecurringRules();
                if (rulesRes.success) setRecurringRules(rulesRes.data);
            }
            return true;
        } else {
            toast.error(result.error);
            return false;
        }
    };

    // Action: Delete Rule
    const deleteRule = async (id) => {
        if (!window.confirm("Are you sure you want to stop this daily schedule?")) return;

        const result = await deleteRecurringRule(id);
        if (result.success) {
            toast.success("Recurring schedule stopped.");
            setRecurringRules(prev => prev.filter(r => r.id !== id));
        } else {
            toast.error(result.error);
        }
    };

    const value = {
        collections,
        recurringRules,
        isLoading,
        createSchedule,
        deleteRule
    };

    return (
        <ScheduleContext.Provider value={value}>
            {children}
        </ScheduleContext.Provider>
    );
};