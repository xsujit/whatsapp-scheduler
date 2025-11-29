import React, { useState } from "react";
import { authClient } from "../lib/auth-client";
import { Button } from "./Button";
import { Input } from "./Input";

export const AuthForm = () => {
    const [isSignUp, setIsSignUp] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            if (isSignUp) {
                const { error } = await authClient.signUp.email({ email, password, name });
                if (error) throw new Error(error.message);
            } else {
                const { error } = await authClient.signIn.email({ email, password });
                if (error) throw new Error(error.message);
            }
            // Assuming parent handles session update or page reload happens automatically
            window.location.reload();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Authentication failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-[80vh] flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <div className="mx-auto h-12 w-12 rounded-xl bg-indigo-600 flex items-center justify-center text-white text-xl font-bold">
                    WA
                </div>
                <h2 className="mt-6 text-center text-2xl font-bold leading-9 tracking-tight text-slate-900">
                    {isSignUp ? "Create your account" : "Sign in to your account"}
                </h2>
                <p className="mt-2 text-center text-sm text-slate-600">
                    Automate your morning routine
                </p>
            </div>

            <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-[480px]">
                <div className="bg-white px-6 py-12 shadow-xl sm:rounded-2xl sm:px-12 border border-slate-100">
                    <form className="space-y-6" onSubmit={handleSubmit}>

                        {isSignUp && (
                            <Input
                                label="Full Name"
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                                autoComplete="name"
                            />
                        )}

                        <Input
                            label="Email address"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            autoComplete="email"
                        />

                        <Input
                            label="Password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            autoComplete={isSignUp ? "new-password" : "current-password"}
                        />

                        {error && (
                            <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">
                                {error}
                            </div>
                        )}

                        <div>
                            <Button type="submit" className="w-full" isLoading={loading}>
                                {isSignUp ? "Sign Up" : "Sign In"}
                            </Button>
                        </div>
                    </form>

                    <div className="mt-6">
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-slate-200" />
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="bg-white px-2 text-slate-500">Or</span>
                            </div>
                        </div>

                        <div className="mt-6 text-center">
                            <button
                                type="button"
                                onClick={() => {
                                    setIsSignUp(!isSignUp);
                                    setError(null);
                                }}
                                className="text-sm font-semibold text-indigo-600 hover:text-indigo-500 focus:outline-none focus:underline"
                            >
                                {isSignUp ? "Already have an account? Sign in" : "New here? Create an account"}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
