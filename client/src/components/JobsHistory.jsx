// client/src/components/JobsHistory.jsx

import React, { useState, useEffect, useRef } from 'react';
import { getSchedules, deleteSchedule } from '../services/scheduleService';
import { DateTime } from 'luxon';
import toast from 'react-hot-toast';
import { StatusBadge } from './common/StatusBadge';

export const JobsHistory = () => {
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const mountedRef = useRef(true); // Track mount status

    const fetchJobs = async () => {
        if (!mountedRef.current) return;

        const res = await getSchedules();

        if (mountedRef.current) {
            if (res.success) {
                setJobs(res.data);
            }
            setLoading(false);
        }
    };

    useEffect(() => {
        mountedRef.current = true;
        let timeoutId;

        const recursiveFetch = async () => {
            await fetchJobs();
            // Only schedule next fetch after previous completes
            if (mountedRef.current) {
                timeoutId = setTimeout(recursiveFetch, 10000);
            }
        };

        recursiveFetch();

        return () => {
            mountedRef.current = false;
            clearTimeout(timeoutId);
        };
    }, []);

    const handleDelete = async (id) => {
        if (!window.confirm('Cancel and delete this schedule?')) return;

        const res = await deleteSchedule(id);

        if (res.success) {
            toast.success('Schedule deleted.');
            fetchJobs();
        } else {
            toast.error(res.error || 'Failed to delete');
        }
    };

    return (
        <div className='space-y-6'>
            <div className='flex items-center justify-between border-b border-slate-200 pb-4'>
                <h2 className='text-2xl font-bold text-slate-900'>Scheduled History</h2>
            </div>

            {loading && jobs.length === 0 ? (
                <div className='text-center py-12'>Loading...</div>
            ) : (
                <div className='bg-white shadow-sm ring-1 ring-slate-900/5 rounded-lg overflow-hidden'>
                    <div className='overflow-x-auto'>
                        <table className='min-w-full divide-y divide-slate-200'>
                            <thead className='bg-slate-50'>
                                <tr>
                                    <th className='px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase'>Status</th>
                                    <th className='px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase'>Scheduled At</th>
                                    <th className='px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase'>Collection</th>
                                    <th className='px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase'>Content</th>
                                    <th className='px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase'>Actions</th>
                                </tr>
                            </thead>
                            <tbody className='divide-y divide-slate-200 bg-white'>
                                {jobs.length === 0 ? (
                                    <tr>
                                        <td colSpan='5' className='px-6 py-8 text-center text-sm text-slate-500'>No schedules found.</td>
                                    </tr>
                                ) : (
                                    jobs.map((job) => (
                                        <tr key={job.id} className='hover:bg-slate-50'>
                                            <td className='px-6 py-4'><StatusBadge status={job.status} /></td>
                                            <td className='px-6 py-4 text-sm text-slate-600 font-mono'>
                                                {DateTime.fromISO(job.scheduled_at).toFormat('MMM dd, HH:mm')}
                                            </td>
                                            <td className='px-6 py-4 text-sm text-slate-900 font-medium'>
                                                {job.collection_name || 'Deleted Collection'}
                                            </td>
                                            <td className='px-6 py-4 text-sm text-slate-500 max-w-xs truncate'>
                                                {job.content}
                                            </td>
                                            <td className='px-6 py-4 text-right text-sm font-medium'>
                                                <button onClick={() => handleDelete(job.id)} className='text-red-600 hover:text-red-900'>Delete</button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};