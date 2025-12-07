import React from 'react';
import { useScheduleContext } from '../../context/ScheduleContext';

export const RecurringRulesList = () => {
    const { recurringRules, collections, deleteRule } = useScheduleContext();

    if (recurringRules.length === 0) return null;

    const getCollectionName = (id) => {
        const col = collections.find(c => c.id === id);
        return col ? col.name : 'Unknown Collection';
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mt-8">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                <h3 className="font-semibold text-slate-800">Active Daily Schedules</h3>
                <span className="bg-indigo-100 text-indigo-700 py-0.5 px-2.5 rounded-full text-xs font-medium">
                    {recurringRules.length} Active
                </span>
            </div>
            <ul className="divide-y divide-slate-100">
                {recurringRules.map((rule) => (
                    <li key={rule.id} className="p-6 hover:bg-slate-50 transition-colors">
                        <div className="flex justify-between items-start gap-4">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-sm font-medium text-slate-900">
                                        Every day at {String(rule.hour).padStart(2, '0')}:{String(rule.minute).padStart(2, '0')}
                                    </span>
                                    <span className="text-xs text-slate-500">•</span>
                                    <span className="text-xs text-slate-500 uppercase tracking-wide">
                                        {getCollectionName(rule.collection_id)}
                                    </span>
                                </div>
                                <p className="text-slate-600 text-sm line-clamp-2">{rule.content}</p>
                            </div>
                            <button
                                onClick={() => deleteRule(rule.id)}
                                className="text-red-500 hover:text-red-700 text-sm font-medium whitespace-nowrap"
                            >
                                Cancel
                            </button>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
};