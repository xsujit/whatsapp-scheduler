import React from "react";
import { authClient } from "./lib/auth-client";
import { AuthForm } from "./components/AuthForm";
import { Scheduler } from "./components/Scheduler";

function App() {
  const { data: session, isPending } = authClient.useSession();

  if (isPending) {
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
        <AuthForm />
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
