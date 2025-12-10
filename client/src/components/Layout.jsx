// client/src/components/Layout.jsx

import React from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';

export const Layout = ({ userEmail }) => {
    return (
        <div className='min-h-screen bg-slate-50'>
            {/* Navbar contains the responsive logic */}
            <Navbar userEmail={userEmail} />

            {/* Main Content Area: Added base 'px-4' for all screen sizes. */}
            <main className='max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8'>
                <Outlet />
            </main>
        </div>
    );
};