import React from 'react';
import { DateTime } from 'luxon';
import { StatusBadge } from '../common/StatusBadge';

// Helper to determine row icon
const JobTypeIcon = ({ definitionId }) => {
    if (definitionId) {
        return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-purple-50 text-purple-700 ring-1 ring-inset ring-purple-600/20" title="Recurring Instance">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Recurring
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-slate-50 text-slate-600 ring-1 ring-inset ring-slate-500/10" title="One-Time Message">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            One-Time
        </span>
    );
};

export const HistoryTable = ({ jobs, onDelete }) => {
    if (jobs.length === 0) {
        return (
            <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-300">
                <p className="text-slate-500">No logs found matching your criteria.</p>
            </div>
        );
    }

    return (
        <div className="bg-white shadow-sm ring-1 ring-slate-900/5 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Type & Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Scheduled For</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Message Preview</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Stats</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                        {jobs.map((job) => {
                            // Assuming status is derived from counts if not explicitly sent by API
                            const displayStatus = job.pending_count > 0 ? 'PENDING' : (job.failed_count > 0 ? 'FAILED' : 'SENT');

                            return (
                                <tr key={job.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col items-start gap-2">
                                            <StatusBadge status={displayStatus} />
                                            <JobTypeIcon definitionId={job.definition_id} />
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-600">
                                        <div className="font-medium text-slate-900">
                                            {DateTime.fromISO(job.scheduled_at).toFormat('MMM dd')}
                                        </div>
                                        <div className="text-xs text-slate-500">
                                            {DateTime.fromISO(job.scheduled_at).toFormat('HH:mm')}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className="text-sm text-slate-600 max-w-xs truncate" title={job.content}>
                                            {job.content}
                                        </p>
                                    </td>
                                    <td className="px-6 py-4 text-sm">
                                        <div className="flex gap-3 text-xs">
                                            <span className="text-green-600 font-medium">{job.sent_count || 0} Sent</span>
                                            <span className="text-red-500 font-medium">{job.failed_count || 0} Fail</span>
                                        </div>
                                        <div className="text-xs text-slate-400 mt-1">
                                            {job.total_count} Total Groups
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right text-sm font-medium">
                                        <button
                                            onClick={() => onDelete(job.id)}
                                            className="text-slate-400 hover:text-red-600 transition-colors"
                                            title="Delete Log"
                                        >
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};