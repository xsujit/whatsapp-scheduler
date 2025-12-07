// client/src/components/Scheduler.jsx

import React from 'react';
import { ScheduleProvider } from '../context/ScheduleContext';
import { ScheduleForm } from './Scheduler/ScheduleForm';
import { RecurringRulesList } from './Scheduler/RecurringRulesList';
import { authClient } from '../lib/auth-client';

// Inner component to handle Header/Layout logic
const SchedulerLayout = () => {
    const handleSignOut = async () => {
        await authClient.signOut();
        window.location.reload();
    };

    return (
        <div className='w-full max-w-2xl mx-auto pb-12'>
            <div className='bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100'>
                {/* Header */}
                <div className='bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-8 text-white'>
                    <div className='flex justify-between items-start'>
                        <div>
                            <h2 className='text-2xl font-bold tracking-tight'>Scheduler</h2>
                            <p className='mt-1 text-indigo-100 opacity-90'>
                                Manage single messages or recurring announcements.
                            </p>
                        </div>
                        <button onClick={handleSignOut} className='text-xs bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-full backdrop-blur-sm transition-colors'>
                            Sign Out
                        </button>
                    </div>
                </div>

                <div className='p-6 md:p-8'>
                    <ScheduleForm />
                </div>
            </div>

            {/* Recurring Rules List placed outside the main card for visual separation */}
            <RecurringRulesList />
        </div>
    );
};

// Main Export wraps the layout in the Provider
export const Scheduler = () => {
    return (
        <ScheduleProvider>
            <SchedulerLayout />
        </ScheduleProvider>
    );
};