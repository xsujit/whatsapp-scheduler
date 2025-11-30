// client/src/components/JobsHistory.jsx

import React, { useState, useEffect, useCallback } from "react";
import { getScheduledJobs } from "../services/scheduleService";
import { DateTime } from 'luxon';

// Helper component for colored status badges
const StatusBadge = ({ status }) => {
    const statusClass = {
        PENDING: "bg-yellow-100 text-yellow-800",
        COMPLETED: "bg-emerald-100 text-emerald-800",
        FAILED: "bg-red-100 text-red-800",
        EXPIRED: "bg-slate-100 text-slate-800",
    }[status] || "bg-slate-50 text-slate-500";
    
    const text = status.charAt(0) + status.slice(1).toLowerCase();

    return (
        <span className={`inline-flex items-center rounded-full px-3 py-0.5 text-xs font-medium ${statusClass}`}>
            {text}
        </span>
    );
};

export const JobsHistory = ({ refreshKey }) => {
    const [jobs, setJobs] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchJobs = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        
        const response = await getScheduledJobs();
        
        if (response.success) {
            setJobs(response.jobs);
        } else {
            setError(response.error);
        }
        setIsLoading(false);
    }, []);

    // Fetch jobs on initial load and whenever refreshKey changes
    useEffect(() => {
        fetchJobs();
    }, [fetchJobs, refreshKey]);

    if (isLoading) {
        return (
            <div className="flex justify-center items-center p-8">
                <div className="animate-spin h-6 w-6 border-2 border-indigo-600 border-t-transparent rounded-full mr-3"></div>
                <p className="text-slate-500">Loading job history...</p>
            </div>
        );
    }

    return (
        <div className="mt-12">
            <h3 className="text-xl font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-600" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l3 3a1 1 0 001.414-1.414L11 9.586V6z" clipRule="evenodd" />
                </svg>
                Scheduled History
            </h3>
            
            {error && (
                <div className="rounded-lg bg-red-50 p-4 border border-red-100 text-red-700 text-sm mb-4">
                    Error loading history: {error}
                </div>
            )}

            {!error && jobs.length === 0 ? (
                <div className="bg-slate-50 p-6 text-center rounded-lg border border-slate-200 text-slate-600">
                    No scheduled messages found in the database.
                </div>
            ) : (
                <div className="overflow-x-auto shadow-md sm:rounded-lg">
                    <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                    Status
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                    Scheduled Time
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                    Recipient (JID)
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                    Message Preview
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-200">
                            {jobs.map((job) => {
                                const scheduledDate = DateTime.fromISO(job.scheduled_at);
                                return (
                                    <tr key={job.id} className="hover:bg-slate-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <StatusBadge status={job.status} />
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-800 font-mono">
                                            {scheduledDate.toFormat('MMM dd, yyyy HH:mm')}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-600 font-medium">
                                            {job.jid}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-500 max-w-xs truncate">
                                            {job.content.substring(0, 50)}...
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};