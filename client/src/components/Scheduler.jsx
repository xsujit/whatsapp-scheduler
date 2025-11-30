// client/src/components/Scheduler.jsx

import React, { useState } from "react";
import { scheduleMessage } from "../services/scheduleService";
import { Button } from "./Button";
import { authClient } from "../lib/auth-client";
import { JobsHistory } from "./JobsHistory"; // <--- NEW IMPORT

export const Scheduler = ({ userEmail }) => {
    const [message, setMessage] = useState("");
    const [isPending, setIsPending] = useState(false);
    const [result, setResult] = useState(null);
    const [refreshKey, setRefreshKey] = useState(0); // <--- NEW STATE

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsPending(true);
        setResult(null);

        const response = await scheduleMessage(message);

        setResult(response);
        setIsPending(false);

        if (response.success) {
            setMessage("");
            setRefreshKey(prev => prev + 1);
        }
    };

    const handleSignOut = async () => {
        await authClient.signOut();
        window.location.reload();
    };

    return (
        <div className="w-full max-w-2xl mx-auto">
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100">
                {/* Header */}
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-8 text-white">
                    <div className="flex justify-between items-start">
                        <div>
                            <h2 className="text-2xl font-bold tracking-tight">Morning Scheduler</h2>
                            <p className="mt-1 text-indigo-100 opacity-90">Draft tonight, sleep tight.</p>
                        </div>
                        <button
                            onClick={handleSignOut}
                            className="text-xs bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-full backdrop-blur-sm transition-colors"
                        >
                            Sign Out
                        </button>
                    </div>
                    <div className="mt-6 text-xs font-mono bg-black/20 inline-block px-3 py-1 rounded-md text-indigo-100">
                        Logged in as: {userEmail}
                    </div>
                </div>

                <div className="p-6 md:p-8 space-y-6">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label htmlFor="message" className="block text-sm font-medium leading-6 text-slate-900">
                                Message Content
                            </label>
                            <textarea
                                id="message"
                                name="message"
                                rows={5}
                                className="block w-full rounded-xl border-0 py-3 px-4 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-200 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 resize-none bg-slate-50 focus:bg-white transition-all"
                                placeholder="Good morning team! Here are the updates for today..."
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                disabled={isPending}
                            />
                            <p className="text-xs text-slate-500 text-right">
                                {message.length} characters
                            </p>
                        </div>

                        <div className="flex justify-end">
                            <Button type="submit" isLoading={isPending} className="w-full sm:w-auto">
                                Schedule Update
                            </Button>
                        </div>
                    </form>

                    {/* Feedback Area */}
                    {result?.error && (
                        <div className="rounded-lg bg-red-50 p-4 border border-red-100 animate-in fade-in slide-in-from-top-2">
                            <div className="flex">
                                <div className="flex-shrink-0">
                                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <div className="ml-3">
                                    <h3 className="text-sm font-medium text-red-800">Submission Failed</h3>
                                    <div className="mt-2 text-sm text-red-700">
                                        <p>{result.error}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {result?.success && (
                        <div className="rounded-lg bg-emerald-50 p-4 border border-emerald-100 animate-in fade-in slide-in-from-top-2">
                            <div className="flex">
                                <div className="flex-shrink-0">
                                    <svg className="h-5 w-5 text-emerald-400" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <div className="ml-3 w-full">
                                    <h3 className="text-sm font-medium text-emerald-800">{result.message}</h3>
                                    {result.scheduledFor && result.scheduledFor.length > 0 && (
                                        <div className="mt-4 bg-white/60 rounded-md p-3">
                                            <ul className="space-y-2">
                                                {result.scheduledFor.map((item, index) => (
                                                    <li key={index} className="flex items-center justify-between text-sm text-emerald-900/80">
                                                        <span className="font-semibold flex items-center gap-2">
                                                            <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
                                                            {item.chat}
                                                        </span>
                                                        <span className="font-mono text-xs bg-emerald-100/50 px-2 py-1 rounded">
                                                            {item.time} {item.timezone}
                                                        </span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            <JobsHistory refreshKey={refreshKey} />
        </div>
    );
};