// client/src/hooks/useJobHistory.js

import { useState, useEffect, useRef, useMemo } from 'react';
import { getSchedules, deactivateSchedule } from '../services/scheduleService';
import toast from 'react-hot-toast';
import { logger } from '../lib/logger';

/**
 * useJobHistory Hook
 * * Manages fetching, polling, filtering, and deletion of schedule history.
 * * TECHNICAL DEBT NOTE: 
 * This hook currently polls the entire dataset every 10 seconds. 
 * As data grows, this should be refactored to:
 * 1. Server-side pagination (API limits).
 * 2. React Query (TanStack Query) for efficient caching/revalidation.
 */
export const useJobHistory = () => {
    const [jobs, setJobs] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('ALL'); // 'ALL' | 'PENDING' | 'COMPLETED'
    const mountedRef = useRef(true);

    const fetchJobs = async () => {
        try {
            const data = await getSchedules();

            if (mountedRef.current) {
                setJobs(data);
            }
        } catch (error) {
            logger.error('Failed to fetch history:', error);
        } finally {
            if (mountedRef.current) setIsLoading(false);
        }
    };

    useEffect(() => {
        mountedRef.current = true;
        fetchJobs();

        // Simple polling mechanism
        const intervalId = setInterval(fetchJobs, 10000);

        return () => {
            mountedRef.current = false;
            clearInterval(intervalId);
        };
    }, []);

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this log? This might cancel pending messages.')) return;

        // Optimistic update (remove from UI immediately)
        const previousJobs = [...jobs];
        setJobs(jobs.filter(job => job.id !== id));

        try {
            await deactivateSchedule(id);
            toast.success('Schedule deleted.');
        } catch (error) {
            setJobs(previousJobs);

            logger.error('Failed to delete schedule:', error);
            toast.error(error.message);
        }
    };

    // Derived State: Filtering
    const filteredJobs = useMemo(() => {
        if (filterStatus === 'ALL') return jobs;

        return jobs.filter(job => {
            // Logic assumes 'pending_count' > 0 implies the job is still processing
            const isPending = job.pending_count > 0;
            return filterStatus === 'PENDING' ? isPending : !isPending;
        });
    }, [jobs, filterStatus]);

    // Derived State: Stats
    const stats = useMemo(() => {
        return {
            total: jobs.length,
            pending: jobs.filter(j => j.pending_count > 0).length,
            completed: jobs.filter(j => j.pending_count === 0).length
        };
    }, [jobs]);

    return {
        jobs: filteredJobs,
        stats,
        isLoading,
        filterStatus,
        setFilterStatus,
        handleDelete,
        refresh: fetchJobs
    };
};