import React, { useState, useEffect } from 'react';
import { useScheduleContext } from '../../context/ScheduleContext';
import { Button } from '../Button';
import { Link } from 'react-router-dom';

export const ScheduleForm = () => {
    const { collections, createSchedule, isLoading } = useScheduleContext();
    
    // Local Form State
    const [type, setType] = useState('ONCE'); // 'ONCE' | 'DAILY'
    const [collectionId, setCollectionId] = useState('');
    const [content, setContent] = useState('');
    const [hour, setHour] = useState('05');
    const [minute, setMinute] = useState('00');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Set default collection when data loads
    useEffect(() => {
        if (collections.length > 0 && !collectionId) {
            setCollectionId(collections[0].id);
        }
    }, [collections, collectionId]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        const payload = {
            type, 
            collectionId: Number(collectionId),
            content,
            hour: parseInt(hour, 10),
            minute: parseInt(minute, 10)
        };

        const success = await createSchedule(payload);
        setIsSubmitting(false);

        if (success) {
            setContent(''); // Clear content only, keep settings
        }
    };

    if (isLoading) return <div className="p-8 text-center text-slate-400">Loading scheduler...</div>;

    if (collections.length === 0) {
        return (
            <div className="bg-yellow-50 text-yellow-800 p-4 rounded-lg text-sm">
                You have no collections yet. <Link to="/collections" className="underline font-bold">Create one here</Link> before scheduling.
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className='space-y-6'>
            
            {/* Frequency Toggle */}
            <div>
                <label className="block text-sm font-medium text-slate-900 mb-2">Frequency</label>
                <div className="flex p-1 bg-slate-100 rounded-lg w-fit">
                    <button
                        type="button"
                        onClick={() => setType('ONCE')}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                            type === 'ONCE' 
                            ? 'bg-white text-indigo-600 shadow-sm' 
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        One Time
                    </button>
                    <button
                        type="button"
                        onClick={() => setType('DAILY')}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                            type === 'DAILY' 
                            ? 'bg-white text-indigo-600 shadow-sm' 
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        Daily Recurring
                    </button>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                    {type === 'ONCE' 
                        ? 'Sends the message once at the next occurrence of the selected time.' 
                        : 'Sends the message every day at the selected time until cancelled.'}
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Collection Selector */}
                <div>
                    <label className="block text-sm font-medium text-slate-900 mb-2">Target Collection</label>
                    <select
                        className="block w-full rounded-lg border-0 py-2.5 px-3 text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm bg-slate-50"
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
                    <label className="block text-sm font-medium text-slate-900 mb-2">
                        {type === 'ONCE' ? 'Send At (24h)' : 'Repeat At (24h)'}
                    </label>
                    <div className="flex gap-2">
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
                        <select
                            className="block w-full rounded-lg border-0 py-2.5 px-3 text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm"
                            value={minute}
                            onChange={(e) => setMinute(e.target.value)}
                        >
                            {Array.from({ length: 60 }).map((_, i) => {
                                const val = i.toString().padStart(2, '0');
                                return <option key={val} value={val}>{val}</option>;
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
                    className='block w-full rounded-xl border-0 py-3 px-4 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-200 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm resize-none bg-slate-50 focus:bg-white transition-all'
                    placeholder={type === 'ONCE' ? 'Good morning team...' : 'Please submit your daily reports...'}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    disabled={isSubmitting}
                    required
                />
            </div>

            <div className='flex justify-end'>
                <Button type='submit' isLoading={isSubmitting} className='w-full sm:w-auto'>
                    {type === 'ONCE' ? 'Schedule One-Time' : 'Create Recurring Rule'}
                </Button>
            </div>
        </form>
    );
};