import React from 'react';

export const HistoryStats = ({ stats }) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col">
                <span className="text-slate-500 text-xs font-medium uppercase tracking-wider">Total Jobs</span>
                <span className="text-2xl font-bold text-slate-800 mt-1">{stats.total}</span>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col border-l-4 border-l-yellow-400">
                <span className="text-slate-500 text-xs font-medium uppercase tracking-wider">Pending / Active</span>
                <span className="text-2xl font-bold text-slate-800 mt-1">{stats.pending}</span>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col border-l-4 border-l-green-400">
                <span className="text-slate-500 text-xs font-medium uppercase tracking-wider">Completed</span>
                <span className="text-2xl font-bold text-slate-800 mt-1">{stats.completed}</span>
            </div>
        </div>
    );
};