// client/src/components/Layout.jsx

// This component handles the 'Links' requirement (Nav) 
// And ensures the UI structure is consistent.

import React from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { authClient } from '../lib/auth-client';

export const Layout = ({ userEmail }) => {
    const location = useLocation();

    const handleSignOut = async () => {
        await authClient.signOut();
        window.location.href = '/'; // Force full clear on logout
    };

    const isActive = (path) => {
        return location.pathname === path
            ? 'bg-indigo-700 text-white'
            : 'text-indigo-100 hover:bg-indigo-600 hover:text-white';
    };

    return (
        <div className='min-h-screen bg-slate-50'>
            {/* Navigation Bar */}
            <nav className='bg-indigo-800 shadow-lg'>
                <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
                    <div className='flex items-center justify-between h-16'>
                        <div className='flex items-center'>
                            <div className='flex-shrink-0'>
                                <span className='text-white font-bold text-lg'>WA Scheduler</span>
                            </div>
                            <div className='hidden md:block'>
                                <div className='ml-10 flex items-baseline space-x-4'>
                                    <Link to='/' className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive('/')}`}>
                                        Schedule
                                    </Link>
                                    <Link to='/collections' className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive('/collections')}`}>
                                        Collections
                                    </Link>
                                    <Link to='/history' className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive('/history')}`}>
                                        History
                                    </Link>
                                    <Link to='/admin' className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive('/admin')}`}>
                                        Admin
                                    </Link>
                                </div>
                            </div>
                        </div>
                        <div className='flex items-center gap-4'>
                            <span className='text-indigo-200 text-xs hidden sm:block'>
                                {userEmail}
                            </span>
                            <button
                                onClick={handleSignOut}
                                className='bg-indigo-900 p-1 rounded-full text-indigo-200 hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-indigo-800 focus:ring-white'
                            >
                                <span className='sr-only'>Sign out</span>
                                <svg className='h-6 w-6' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth='2' d='M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1' />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Main Content Area */}
            <main className='max-w-7xl mx-auto py-6 sm:px-6 lg:px-8'>
                <Outlet />
            </main>
        </div>
    );
};