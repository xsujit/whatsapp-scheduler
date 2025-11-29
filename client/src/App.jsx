import { useActionState, useState } from "react";
import { authClient } from "./lib/auth-client"; // Import the client we made
import "./App.css";

// --- EXISTING SCHEDULE ACTION (Slightly modified to include credentials) ---
async function scheduleMessageAction(previousState, formData) {
    const message = formData.get("message");

    if (!message || message.trim() === "") {
        return { error: "Please write a message first." };
    }

    try {
        // 'include' credentials is REQUIRED for the server to see the session cookie
        const response = await fetch("http://localhost:3001/api/schedule", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message }),
            credentials: "include", 
        });

        const data = await response.json();

        if (!response.ok) {
            return { error: data.error || "Server Error" };
        }

        return {
            success: data.success,
            message: data.message,
            scheduledFor: data.scheduledFor,
        };
    } catch (err) {
        return { error: "❌ Connection failed: " + err };
    }
}

function App() {
    // Better Auth Hook to check session
    const { data: session, isPending: isAuthPending } = authClient.useSession();
    
    const [scheduleState, scheduleAction, isSchedulePending] = useActionState(scheduleMessageAction, null);
    
    // Local state for Sign In form
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isSignUp, setIsSignUp] = useState(false);
    const [authError, setAuthError] = useState(null);

    const handleAuth = async (e) => {
        e.preventDefault();
        setAuthError(null);
        
        const action = isSignUp ? authClient.signUp.email : authClient.signIn.email;
        
        const { data, error } = await action({
            email,
            password,
            name: isSignUp ? "New User" : undefined, // Only send name on sign up
        });

        if (error) setAuthError(error.message);
    };

    const handleSignOut = async () => {
        await authClient.signOut();
    };

    if (isAuthPending) return <div className="container">Loading user...</div>;

    // --- RENDER LOGIN SCREEN IF NO SESSION ---
    if (!session) {
        return (
            <div className="container">
                <div className="card">
                    <h2>{isSignUp ? "Create Account" : "Welcome Back"}</h2>
                    <form onSubmit={handleAuth}>
                        <div className="input-group">
                            <label>Email</label>
                            <input 
                                type="email" 
                                value={email} 
                                onChange={e => setEmail(e.target.value)} 
                                required 
                            />
                        </div>
                        <div className="input-group">
                            <label>Password</label>
                            <input 
                                type="password" 
                                value={password} 
                                onChange={e => setPassword(e.target.value)} 
                                required 
                            />
                        </div>
                        <button type="submit" className="submit-btn">
                            {isSignUp ? "Sign Up" : "Sign In"}
                        </button>
                    </form>
                    {authError && <div className="alert error">{authError}</div>}
                    
                    <button 
                        className="link-btn"
                        onClick={() => setIsSignUp(!isSignUp)}
                    >
                        {isSignUp ? "Already have an account? Sign In" : "Need an account? Sign Up"}
                    </button>
                </div>
            </div>
        );
    }

    // --- RENDER SCHEDULER IF LOGGED IN ---
    return (
        <div className="container">
            <div className="card">
                <div className="header-row">
                    <h2>🌅 WhatsApp Morning Scheduler</h2>
                    <button onClick={handleSignOut} className="logout-btn">
                        Sign Out ({session.user.email})
                    </button>
                </div>
                <p className="subtitle">Draft tonight, sleep tight.</p>

                <form action={scheduleAction}>
                    <div className="input-group">
                        <label htmlFor="message">Message Draft</label>
                        <textarea
                            id="message"
                            name="message"
                            rows="6"
                            placeholder="Good morning team! Here are the updates..."
                            disabled={isSchedulePending}
                        />
                    </div>

                    <button type="submit" disabled={isSchedulePending} className="submit-btn">
                        {isSchedulePending ? "Scheduling..." : "Schedule Message"}
                    </button>
                </form>

                {scheduleState?.error && <div className="alert error">{scheduleState.error}</div>}
                {scheduleState?.success && (
                    <div className="alert success">
                        <h4 className="schedule-header">{scheduleState.message}</h4>
                        {scheduleState.scheduledFor?.length > 0 && (
                            <ul className="schedule-list">
                                {scheduleState.scheduledFor.map((item, index) => (
                                    <li key={index} className="schedule-item">
                                        <span className="chat-name">👥 {item.chat}</span>
                                        <span> at </span>
                                        <span className="time-highlight">{item.time}</span>
                                        <span className="timezone-display"> ({item.timezone})</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default App;