import { useState, useEffect, useRef, useMemo } from 'react';
import { getSchedules, deactivateSchedule } from '../services/scheduleService';
import toast from 'react-hot-toast';

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
            const res = await getSchedules();
            if (mountedRef.current && res.success) {
                setJobs(res.data);
            }
        } catch (error) {
            console.error("Failed to fetch history:", error);
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

        const res = await deactivateSchedule(id);

        if (res.success) {
            toast.success('Schedule deleted.');
        } else {
            // Revert on failure
            setJobs(previousJobs);
            toast.error(res.error || 'Failed to delete');
        }
    };

    // Derived State: Filtering
    const filteredJobs = useMemo(() => {
        if (filterStatus === 'ALL') return jobs;

        return jobs.filter(job => {
            // Logic assumes 'pending_count' > 0 implies the job is still processing
            // Adjust based on your specific status enum logic if needed
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