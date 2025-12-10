// client/src/components/Navbar.jsx

import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { authClient } from '../lib/auth-client';

// DRY: Define links once
const NAV_ITEMS = [
    { label: 'Schedule', path: '/' },
    { label: 'Collections', path: '/collections' },
    { label: 'History', path: '/history' },
    { label: 'Admin', path: '/admin' },
];

export const Navbar = ({ userEmail }) => {
    const [isOpen, setIsOpen] = useState(false);
    const location = useLocation();

    const handleSignOut = async () => {
        await authClient.signOut();
        window.location.href = '/'; 
    };

    const handleLinkClick = () => {
        setIsOpen(false);
    };

    const isActive = (path) => {
        // Base styles for both mobile and desktop
        const baseStyle = "px-3 py-2 rounded-md text-sm font-medium transition-colors block";
        const activeStyle = "bg-indigo-700 text-white";
        const inactiveStyle = "text-indigo-100 hover:bg-indigo-600 hover:text-white";

        return location.pathname === path 
            ? `${baseStyle} ${activeStyle}` 
            : `${baseStyle} ${inactiveStyle}`;
    };

    return (
        <nav className='bg-indigo-800 shadow-lg relative z-50'>
            <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
                <div className='flex items-center justify-between h-16'>
                    
                    {/* --- Logo Section --- */}
                    <div className='flex items-center'>
                        <div className='flex-shrink-0'>
                            <span className='text-white font-bold text-lg'>WA Scheduler</span>
                        </div>
                        
                        {/* --- DESKTOP MENU (Hidden on Mobile) --- */}
                        <div className='hidden md:block'>
                            <div className='ml-10 flex items-baseline space-x-4'>
                                {NAV_ITEMS.map((item) => (
                                    <Link 
                                        key={item.path} 
                                        to={item.path} 
                                        className={isActive(item.path)}
                                    >
                                        {item.label}
                                    </Link>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* --- DESKTOP Right Side (User/Logout) --- */}
                    <div className='hidden md:flex items-center gap-4'>
                        <span className='text-indigo-200 text-xs'>
                            {userEmail}
                        </span>
                        <SignOutButton onClick={handleSignOut} />
                    </div>

                    {/* --- MOBILE HAMBURGER BUTTON --- */}
                    <div className='md:hidden flex items-center'>
                        <button
                            onClick={() => setIsOpen(!isOpen)}
                            type="button"
                            className="bg-indigo-900 inline-flex items-center justify-center p-2 rounded-md text-indigo-200 hover:text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-indigo-800 focus:ring-white transition-colors duration-200"
                            aria-controls="mobile-menu"
                            aria-expanded={isOpen}
                            aria-label="Toggle navigation"
                        >
                            {/* Icon Transition */}
                            <div className="relative w-6 h-6">
                                <svg 
                                    className={`absolute inset-0 transform transition-all duration-300 ease-in-out ${isOpen ? 'opacity-0 rotate-90 scale-75' : 'opacity-100 rotate-0 scale-100'}`} 
                                    xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                                </svg>
                                <svg 
                                    className={`absolute inset-0 transform transition-all duration-300 ease-in-out ${isOpen ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-75'}`}
                                    xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </div>
                        </button>
                    </div>
                </div>
            </div>

            {/* --- MOBILE MENU DROPDOWN (Animated) --- */}
            {/* Tech Note: We use grid-template-rows to animate height from 0 to auto.
                The inner container must have overflow-hidden.
            */}
            <div 
                className={`md:hidden grid transition-[grid-template-rows,opacity,padding] duration-300 ease-in-out ${
                    isOpen 
                        ? 'grid-rows-[1fr] opacity-100 border-t border-indigo-700' 
                        : 'grid-rows-[0fr] opacity-0 border-t-0'
                }`}
            >
                <div className="overflow-hidden">
                    <div className='px-2 pt-2 pb-3 space-y-1 sm:px-3'>
                        {NAV_ITEMS.map((item) => (
                            <Link 
                                key={item.path} 
                                to={item.path} 
                                className={isActive(item.path)}
                                onClick={handleLinkClick}
                            >
                                {item.label}
                            </Link>
                        ))}
                    </div>
                    {/* Mobile User Info & Logout */}
                    <div className='pt-4 pb-4 border-t border-indigo-700'>
                        <div className='flex items-center px-5'>
                            <div className='flex-shrink-0'>
                                {/* User Initial Circle */}
                                <div className="h-8 w-8 rounded-full bg-indigo-600 flex items-center justify-center text-indigo-200 font-bold">
                                    {userEmail?.charAt(0).toUpperCase()}
                                </div>
                            </div>
                            <div className='ml-3'>
                                <div className='text-sm font-medium leading-none text-indigo-200'>{userEmail}</div>
                            </div>
                            <div className='ml-auto'>
                                <SignOutButton onClick={handleSignOut} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </nav>
    );
};

const SignOutButton = ({ onClick }) => (
    <button
        onClick={onClick}
        className='bg-indigo-900 p-1 rounded-full text-indigo-200 hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-indigo-800 focus:ring-white transition-transform hover:scale-105'
        title="Sign Out"
    >
        <span className='sr-only'>Sign out</span>
        <svg className='h-6 w-6' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth='2' d='M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1' />
        </svg>
    </button>
);