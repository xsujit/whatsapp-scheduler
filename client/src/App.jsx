// client/src/App.jsx

import React, { useState, useEffect } from "react";
import { authClient } from "./lib/auth-client";
import { AuthForm } from "./components/AuthForm";
import { Scheduler } from "./components/Scheduler";

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
                console.error("Failed to fetch app config:", err);
            } finally {
                setIsConfigPending(false);
            }
        };
        fetchConfig();
    }, []);

    if (isPending || isConfigPending) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 space-y-4">
                <div className="animate-spin h-10 w-10 border-4 border-indigo-600 border-t-transparent rounded-full"></div>
                <p className="text-slate-500 font-medium animate-pulse">Loading Application...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
            {!session ? (
                <AuthForm allowRegistration={allowRegistration} />
            ) : (
                <Scheduler userEmail={session.user.email} />
            )}
            {/* Footer */}
            <footer className="mt-16 text-center text-sm text-slate-400">
                <p>&copy; {new Date().getFullYear()} WhatsApp Scheduler. All rights reserved.</p>
            </footer>
        </div>
    );
}

export default App;