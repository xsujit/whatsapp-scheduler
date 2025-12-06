// client/src/components/Scheduler.jsx

import React, { useState, useEffect } from 'react';
import { createSchedule } from '../services/scheduleService';
import { getAllCollections } from '../services/collectionService';
import { Button } from './Button';
import { authClient } from '../lib/auth-client';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';

export const Scheduler = ({ }) => {
    const [collections, setCollections] = useState([]);
    const [loadingCols, setLoadingCols] = useState(true);

    // Form State
    const [collectionId, setCollectionId] = useState('');
    const [content, setContent] = useState('');
    const [hour, setHour] = useState('09');
    const [minute, setMinute] = useState('00');
    const [isPending, setIsPending] = useState(false);

    useEffect(() => {
        const loadCollections = async () => {
            const res = await getAllCollections();
            if (res.success) {
                setCollections(res.data);
                if (res.data.length > 0) setCollectionId(res.data[0].id);
            }
            setLoadingCols(false);
        };
        loadCollections();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!collectionId) {
            toast.error('Please create a Collection first!');
            return;
        }

        setIsPending(true);

        const payload = {
            collectionId: Number(collectionId),
            content,
            hour: parseInt(hour, 10),
            minute: parseInt(minute, 10)
        };

        const response = await createSchedule(payload);
        setIsPending(false);

        if (response.success) {
            toast.success(response.message);
            setContent('');
        } else {
            toast.error(response.error);
        }
    };

    const handleSignOut = async () => {
        await authClient.signOut();
        window.location.reload();
    };

    return (
        <div className='w-full max-w-2xl mx-auto'>
            <div className='bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100'>
                {/* Header */}
                <div className='bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-8 text-white'>
                    <div className='flex justify-between items-start'>
                        <div>
                            <h2 className='text-2xl font-bold tracking-tight'>New Schedule</h2>
                            <p className='mt-1 text-indigo-100 opacity-90'>Queue a message for your teams.</p>
                        </div>
                        <button onClick={handleSignOut} className='text-xs bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-full backdrop-blur-sm transition-colors'>
                            Sign Out
                        </button>
                    </div>
                </div>

                <div className='p-6 md:p-8 space-y-6'>
                    {collections.length === 0 && !loadingCols ? (
                        <div className="bg-yellow-50 text-yellow-800 p-4 rounded-lg text-sm">
                            You have no collections yet. <Link to="/collections" className="underline font-bold">Create one here</Link> before scheduling.
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className='space-y-6'>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Collection Selector */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-900 mb-2">Target Collection</label>
                                    <select
                                        className="block w-full rounded-lg border-0 py-2.5 px-3 text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6 bg-slate-50"
                                        value={collectionId}
                                        onChange={(e) => setCollectionId(e.target.value)}
                                    >
                                        {collections.map(col => (
                                            <option key={col.id} value={col.id}>{col.name} ({col.item_count} groups)</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Time Selector */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-900 mb-2">Time (24h)</label>
                                    <div className="flex gap-2">
                                        {/* Hour Select (Unchanged) */}
                                        <select
                                            className="block w-full rounded-lg border-0 py-2.5 px-3 text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm"
                                            value={hour}
                                            onChange={(e) => setHour(e.target.value)}
                                        >
                                            {Array.from({ length: 24 }).map((_, i) => {
                                                const val = i.toString().padStart(2, '0');
                                                return <option key={val} value={val}>{val}</option>;
                                            })}
                                        </select>

                                        <span className="self-center font-bold text-slate-400">:</span>

                                        {/* Minute Select (UPDATED) */}
                                        <select
                                            className="block w-full rounded-lg border-0 py-2.5 px-3 text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm"
                                            value={minute}
                                            onChange={(e) => setMinute(e.target.value)}
                                        >
                                            {Array.from({ length: 30 }).map((_, i) => {
                                                const minuteValue = i * 2;
                                                const val = minuteValue.toString().padStart(2, '0');
                                                return (
                                                    <option key={val} value={val}>
                                                        {val}
                                                    </option>
                                                );
                                            })}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Content */}
                            <div className='space-y-2'>
                                <label htmlFor='message' className='block text-sm font-medium leading-6 text-slate-900'>
                                    Message Content
                                </label>
                                <textarea
                                    id='message'
                                    rows={5}
                                    className='block w-full rounded-xl border-0 py-3 px-4 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-200 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 resize-none bg-slate-50 focus:bg-white transition-all'
                                    placeholder='Good morning team...'
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                    disabled={isPending}
                                />
                            </div>

                            <div className='flex justify-end'>
                                <Button type='submit' isLoading={isPending} className='w-full sm:w-auto'>
                                    Schedule Message
                                </Button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};