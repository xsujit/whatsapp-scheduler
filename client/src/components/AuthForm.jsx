// client/src/components/AuthForm.jsx

import React, { useState } from 'react';
import { authClient } from '../lib/auth-client';
import { Button } from './Button';
import { Input } from './Input';
import { signUpSchema, signInSchema } from '../lib/schemas';

export const AuthForm = () => {
    const [isSignUp, setIsSignUp] = useState(false);
    
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: ''
    });

    const [errors, setErrors] = useState({});
    const [generalError, setGeneralError] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (errors[field]) setErrors(prev => ({ ...prev, [field]: null }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrors({});
        setGeneralError(null);

        // 1. Select Schema
        const schema = isSignUp ? signUpSchema : signInSchema;
        
        // 2. Prepare Data (exclude name if signing in)
        const dataToValidate = isSignUp 
            ? formData 
            : { email: formData.email, password: formData.password };

        // 3. Validate
        const result = schema.safeParse(dataToValidate);

        if (!result.success) {
            const fieldErrors = {};
            result.error.issues.forEach((issue) => {
                fieldErrors[issue.path[0]] = issue.message;
            });
            setErrors(fieldErrors);
            return;
        }

        setLoading(true);

        try {
            if (isSignUp) {
                const { error } = await authClient.signUp.email({ 
                    email: formData.email, 
                    password: formData.password, 
                    name: formData.name 
                });
                if (error) throw new Error(error.message);
            } else {
                const { error } = await authClient.signIn.email({ 
                    email: formData.email, 
                    password: formData.password 
                });
                if (error) throw new Error(error.message);
            }
            window.location.reload();
        } catch (err) {
            setGeneralError(err instanceof Error ? err.message : 'Authentication failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className='flex min-h-[80vh] flex-col justify-center py-12 sm:px-6 lg:px-8'>
            <div className='sm:mx-auto sm:w-full sm:max-w-md'>
                <div className='mx-auto h-12 w-12 rounded-xl bg-indigo-600 flex items-center justify-center text-white text-xl font-bold'>
                    WA
                </div>
                <h2 className='mt-6 text-center text-2xl font-bold leading-9 tracking-tight text-slate-900'>
                    {isSignUp ? 'Create your account' : 'Sign in to your account'}
                </h2>
            </div>

            <div className='mt-10 sm:mx-auto sm:w-full sm:max-w-[480px]'>
                <div className='bg-white px-6 py-12 shadow-xl sm:rounded-2xl sm:px-12 border border-slate-100'>
                    <form className='space-y-6' onSubmit={handleSubmit}>
                        {isSignUp && (
                            <div>
                                <Input
                                    label='Full Name'
                                    type='text'
                                    value={formData.name}
                                    onChange={(e) => handleInputChange('name', e.target.value)}
                                    autoComplete='name'
                                />
                                {errors.name && <p className='mt-1 text-xs text-red-600'>{errors.name}</p>}
                            </div>
                        )}

                        <div>
                            <Input
                                label='Email address'
                                type='email'
                                value={formData.email}
                                onChange={(e) => handleInputChange('email', e.target.value)}
                                autoComplete='email'
                            />
                            {errors.email && <p className='mt-1 text-xs text-red-600'>{errors.email}</p>}
                        </div>

                        <div>
                            <Input
                                label='Password'
                                type='password'
                                value={formData.password}
                                onChange={(e) => handleInputChange('password', e.target.value)}
                                autoComplete={isSignUp ? 'new-password' : 'current-password'}
                            />
                            {errors.password && <p className='mt-1 text-xs text-red-600'>{errors.password}</p>}
                        </div>

                        {generalError && (
                            <div className='rounded-md bg-red-50 p-4 text-sm text-red-700'>
                                {generalError}
                            </div>
                        )}

                        <div>
                            <Button type='submit' className='w-full' isLoading={loading}>
                                {isSignUp ? 'Sign Up' : 'Sign In'}
                            </Button>
                        </div>
                    </form>

                    <div className='mt-6'>
                        <div className='relative'>
                            <div className='absolute inset-0 flex items-center'>
                                <div className='w-full border-t border-slate-200' />
                            </div>
                            <div className='relative flex justify-center text-sm'>
                                <span className='bg-white px-2 text-slate-500'>Or</span>
                            </div>
                        </div>
                        <div className='mt-6 text-center'>
                            <button
                                type='button'
                                onClick={() => {
                                    setIsSignUp(!isSignUp);
                                    setErrors({});
                                    setGeneralError(null);
                                }}
                                className='text-sm font-semibold text-indigo-600 hover:text-indigo-500 focus:outline-none focus:underline'
                            >
                                {isSignUp ? 'Already have an account? Sign in' : 'New here? Create an account'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};