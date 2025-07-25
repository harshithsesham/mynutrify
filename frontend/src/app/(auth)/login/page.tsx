// app/(auth)/login/page.tsx
'use client';

import { useState, Suspense } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter, useSearchParams } from 'next/navigation';
import { LogIn, UserPlus, Mail, AlertCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';

// Separate component that uses useSearchParams
function LoginForm() {
    const [isLoginView, setIsLoginView] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showEmailSent, setShowEmailSent] = useState(false);

    const router = useRouter();
    const searchParams = useSearchParams();
    const supabase = createClientComponentClient();

    // Check for error in URL params (from auth callback)
    const urlError = searchParams.get('error');
    if (urlError && !error) {
        setError(urlError);
    }

    const handleAuthAction = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        if (isLoginView) {
            // Handle Sign In
            const { error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) {
                setError(error.message);
            } else {
                // Check if user has a role
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('role')
                        .eq('user_id', user.id)
                        .single();

                    if (!profile?.role) {
                        router.push('/role-selection');
                    } else {
                        router.push('/dashboard');
                    }
                    router.refresh();
                }
            }
        } else {
            // Handle Sign Up
            const { error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: { full_name: fullName },
                    emailRedirectTo: `${window.location.origin}/callback?next=/role-selection`,
                },
            });

            if (error) {
                setError(error.message);
            } else {
                setShowEmailSent(true);
            }
        }
        setLoading(false);
    };

    if (showEmailSent) {
        return (
            <div className="bg-gray-50 text-gray-800 min-h-screen flex flex-col items-center justify-center font-sans p-4">
                <div className="w-full max-w-md">
                    <div className="bg-white p-8 rounded-2xl shadow-md text-center">
                        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Mail className="w-8 h-8 text-blue-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-800 mb-4">Check Your Email</h2>
                        <p className="text-gray-600 mb-6">
                            We&apos;ve sent a confirmation link to <strong>{email}</strong>.
                            Please click the link in the email to verify your account and complete your signup.
                        </p>
                        <div className="space-y-4">
                            <p className="text-sm text-gray-500">
                                Don&apos;t see the email? Check your spam folder or wait a few minutes.
                            </p>
                            <button
                                onClick={() => {
                                    setShowEmailSent(false);
                                    setIsLoginView(true);
                                    setEmail('');
                                    setPassword('');
                                    setFullName('');
                                }}
                                className="text-blue-600 hover:text-blue-700 font-semibold"
                            >
                                Back to Login
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-gray-50 text-gray-800 min-h-screen flex flex-col items-center justify-center font-sans p-4">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <Link href="/" className="text-3xl font-bold text-gray-800">Nutrishiksha</Link>
                    <p className="text-gray-600 mt-2">
                        {isLoginView ? 'Welcome back! Sign in to continue.' : 'Create an account to get started.'}
                    </p>
                </div>
                <div className="bg-white p-8 rounded-2xl shadow-md">
                    <form onSubmit={handleAuthAction}>
                        {!isLoginView && (
                            <div className="mb-4">
                                <label className="block text-gray-600 font-medium mb-2" htmlFor="fullName">
                                    Full Name
                                </label>
                                <input
                                    type="text"
                                    id="fullName"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-gray-800 focus:border-transparent"
                                    required
                                />
                            </div>
                        )}
                        <div className="mb-4">
                            <label className="block text-gray-600 font-medium mb-2" htmlFor="email">
                                Email
                            </label>
                            <input
                                type="email"
                                id="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-gray-800 focus:border-transparent"
                                required
                            />
                        </div>
                        <div className="mb-6">
                            <label className="block text-gray-600 font-medium mb-2" htmlFor="password">
                                Password
                            </label>
                            <input
                                type="password"
                                id="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-gray-800 focus:border-transparent"
                                required
                                minLength={6}
                            />
                            {!isLoginView && (
                                <p className="text-sm text-gray-500 mt-1">Password must be at least 6 characters</p>
                            )}
                        </div>
                        {error && (
                            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                                <AlertCircle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
                                <p className="text-red-600 text-sm">{error}</p>
                            </div>
                        )}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-gray-800 hover:bg-gray-700 text-white font-bold py-3 px-4 rounded-lg transition duration-300 disabled:bg-gray-500 flex items-center justify-center"
                        >
                            {loading ? (
                                <div className="flex items-center">
                                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                                    Processing...
                                </div>
                            ) : (
                                isLoginView ? (
                                    <>
                                        <LogIn className="mr-2" size={20} />
                                        Sign In
                                    </>
                                ) : (
                                    <>
                                        <UserPlus className="mr-2" size={20} />
                                        Create Account
                                    </>
                                )
                            )}
                        </button>
                    </form>
                    <p className="text-center text-gray-600 mt-6">
                        {isLoginView ? "Don&apos;t have an account?" : "Already have an account?"}
                        <button
                            onClick={() => {
                                setIsLoginView(!isLoginView);
                                setError('');
                                setEmail('');
                                setPassword('');
                                setFullName('');
                            }}
                            className="text-gray-800 hover:underline font-semibold ml-2 focus:outline-none"
                        >
                            {isLoginView ? 'Sign Up' : 'Sign In'}
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
}

// Loading fallback component
function LoginPageSkeleton() {
    return (
        <div className="bg-gray-50 text-gray-800 min-h-screen flex flex-col items-center justify-center font-sans p-4">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <div className="text-3xl font-bold text-gray-800">Nutrishiksha</div>
                    <div className="h-4 bg-gray-200 rounded mt-2 animate-pulse"></div>
                </div>
                <div className="bg-white p-8 rounded-2xl shadow-md">
                    <div className="space-y-4">
                        <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                        <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
                        <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                        <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
                        <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
                    </div>
                    <div className="flex items-center justify-center mt-6">
                        <Loader2 className="animate-spin h-6 w-6 text-gray-600" />
                        <span className="ml-2 text-gray-600">Loading...</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Main page component with Suspense boundary
export default function LoginPage() {
    return (
        <Suspense fallback={<LoginPageSkeleton />}>
            <LoginForm />
        </Suspense>
    );
}