// client/src/components/JobsHistory.jsx

import React from 'react';
import { useJobHistory } from '../hooks/useJobHistory';
import { HistoryStats } from './History/HistoryStats';
import { HistoryTable } from './History/HistoryTable';

export const JobsHistory = () => {
    const {
        jobs,
        stats,
        isLoading,
        filterStatus,
        setFilterStatus,
        handleDelete
    } = useJobHistory();

    return (
        <div className="space-y-6 pb-12"> 
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Execution History</h2>
                    <p className="mt-1 text-slate-500 text-sm">
                        Monitor the status of your One-Time messages and Recurring schedule executions.
                    </p>
                </div>

                {/* Filter Controls */}
                <div className="flex bg-slate-100 p-1 rounded-lg">
                    {['ALL', 'PENDING', 'COMPLETED'].map((filter) => (
                        <button
                            key={filter}
                            onClick={() => setFilterStatus(filter)}
                            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${filterStatus === filter
                                    ? 'bg-white text-indigo-600 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            {filter.charAt(0) + filter.slice(1).toLowerCase()}
                        </button>
                    ))}
                </div>
            </div>

            {/* Stats Overview */}
            <HistoryStats stats={stats} />

            {/* Main Content */}
            {isLoading ? (
                <div className="flex justify-center items-center py-20 opacity-50">
                    <div className="animate-spin h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full"></div>
                </div>
            ) : (
                <HistoryTable jobs={jobs} onDelete={handleDelete} />
            )}
        </div>
    );
};