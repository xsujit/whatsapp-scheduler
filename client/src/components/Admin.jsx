// client/src/components/Admin.jsx

import React, { useEffect, useState } from 'react';
import { logger } from '../lib/logger';

export const Admin = () => {
    const [health, setHealth] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkHealth = async () => {
            try {
                // Fetching from the endpoint defined in app.js
                const res = await fetch('/health');
                const data = await res.json();
                setHealth(data);
            } catch (err) {
                logger.error('Health check failed', err);
            } finally {
                setLoading(false);
            }
        };
        checkHealth();
    }, []);

    if (loading) return <div className='p-8'>Loading Admin Dashboard...</div>;

    const isConnected = health?.whatsapp?.connected;

    return (
        <div className='space-y-8'>
            <h2 className='text-2xl font-bold text-slate-900'>Administration</h2>

            {/* WhatsApp Connection Status Card */}
            <div className='bg-white overflow-hidden rounded-xl border border-slate-200 shadow-sm'>
                <div className='px-6 py-5 border-b border-slate-200 bg-slate-50'>
                    <h3 className='text-base font-semibold leading-6 text-slate-900'>System Status</h3>
                </div>
                <div className='px-6 py-5 grid grid-cols-1 gap-6 sm:grid-cols-2'>
                    <div>
                        <dt className='text-sm font-medium text-slate-500'>WhatsApp Service</dt>
                        <dd className='mt-1 flex items-center'>
                            <span className={`h-2.5 w-2.5 rounded-full mr-2 ${isConnected ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                            <span className={`text-sm font-medium ${isConnected ? 'text-emerald-700' : 'text-red-700'}`}>
                                {isConnected ? 'Connected' : 'Disconnected'}
                            </span>
                        </dd>
                    </div>
                    <div>
                        <dt className='text-sm font-medium text-slate-500'>Service Uptime</dt>
                        <dd className='mt-1 text-sm text-slate-900 font-mono'>{health?.uptime || 'N/A'}</dd>
                    </div>
                    {isConnected && (
                        <div className='sm:col-span-2'>
                            <dt className='text-sm font-medium text-slate-500'>Connected JID</dt>
                            <dd className='mt-1 text-sm text-slate-900 font-mono bg-slate-100 inline-block px-2 py-1 rounded'>
                                {health?.whatsapp?.jid}
                            </dd>
                        </div>
                    )}
                </div>
            </div>

            {/* Management Links */}
            <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
                <div className='relative flex items-center space-x-3 rounded-lg border border-slate-300 bg-white px-6 py-5 shadow-sm focus-within:ring-2 focus-within:ring-indigo-500 focus-within:ring-offset-2 hover:border-slate-400 cursor-pointer transition-colors'>
                    <div className='flex-shrink-0'>
                        <div className='h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600'>
                            <svg className='h-6 w-6' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth='2' d='M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' />
                            </svg>
                        </div>
                    </div>
                    <div className='min-w-0 flex-1'>
                        <span className='absolute inset-0' aria-hidden='true' />
                        <p className='text-sm font-medium text-slate-900'>Manage Users</p>
                        <p className='truncate text-sm text-slate-500'>Add, remove, or edit system access.</p>
                    </div>
                </div>

                <div className='relative flex items-center space-x-3 rounded-lg border border-slate-300 bg-white px-6 py-5 shadow-sm focus-within:ring-2 focus-within:ring-indigo-500 focus-within:ring-offset-2 hover:border-slate-400 cursor-pointer transition-colors'>
                    <div className='flex-shrink-0'>
                        <div className='h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600'>
                            <svg className='h-6 w-6' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth='2' d='M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10' />
                            </svg>
                        </div>
                    </div>
                    <div className='min-w-0 flex-1'>
                        <span className='absolute inset-0' aria-hidden='true' />
                        <p className='text-sm font-medium text-slate-900'>Bulk Job Manager</p>
                        <p className='truncate text-sm text-slate-500'>Cancel or retry multiple messages.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};