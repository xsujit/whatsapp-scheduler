// client/src/App.jsx

import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { authClient } from './lib/auth-client';
import { logger } from './lib/logger';

// Components
import { AuthForm } from './components/AuthForm';
import { Scheduler } from './components/Scheduler';
import { JobsHistory } from './components/JobsHistory';
import { Admin } from './components/Admin';
import { Layout } from './components/Layout';
import { CollectionManager } from './components/CollectionManager';

function App() {
    const { data: session, isPending } = authClient.useSession();
    const [allowRegistration, setAllowRegistration] = useState(false);
    const [isConfigPending, setIsConfigPending] = useState(true);

    useEffect(() => {
        const fetchConfig = async () => {
            try {
                const response = await fetch('/api/config');
                const config = await response.json();
                setAllowRegistration(config.allowRegistration);
            } catch (err) {
                logger.error('Failed to fetch app config:', err);
            } finally {
                setIsConfigPending(false);
            }
        };
        fetchConfig();
    }, []);

    if (isPending || isConfigPending) {
        return (
            <div className='min-h-screen flex flex-col items-center justify-center bg-slate-50 space-y-4'>
                <div className='animate-spin h-10 w-10 border-4 border-indigo-600 border-t-transparent rounded-full'></div>
                <p className='text-slate-500 font-medium animate-pulse'>Loading Application...</p>
            </div>
        );
    }

    // 1. Unauthenticated Route
    if (!session) {
        return (
            <div className='min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8'>
                {/* Add Toaster so Auth errors are visible */}
                <Toaster position="top-center" reverseOrder={false} />
                <AuthForm allowRegistration={allowRegistration} />
            </div>
        );
    }

    // 2. Authenticated Routes (Wrapped in BrowserRouter)
    return (
        <BrowserRouter>
            {/* Add Toaster for the main app */}
            <Toaster position="top-right" reverseOrder={false} />
            <Routes>
                <Route path='/' element={<Layout userEmail={session.user.email} />}>
                    <Route index element={<Scheduler />} />
                    <Route path='collections' element={<CollectionManager />} />
                    <Route path='history' element={<JobsHistory />} />
                    <Route path='admin' element={<Admin />} />
                    <Route path='*' element={<Navigate to='/' replace />} />
                </Route>
            </Routes>
        </BrowserRouter>
    );
}

export default App;