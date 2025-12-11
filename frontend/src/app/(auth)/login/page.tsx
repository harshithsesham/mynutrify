// frontend/src/app/(auth)/login/page.tsx
'use client';

import { useState, Suspense } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter, useSearchParams } from 'next/navigation';
import { LogIn, UserPlus, Mail, AlertCircle, Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

// Component for primary action button styling
const PrimaryButton = ({ isLoginView, loading }: { isLoginView: boolean, loading: boolean }) => (
    <button
        type="submit"
        disabled={loading}
        className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-3 px-4 rounded-full transition duration-300 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center shadow-lg hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-teal-500/50"
    >
        {loading ? (
            <div className="flex items-center">
                <Loader2 className="animate-spin h-5 w-5 mr-2" />
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
);


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

    // Redesigned Email Confirmation Screen
    if (showEmailSent) {
        return (
            <div className="bg-gray-50 text-gray-800 min-h-screen flex flex-col items-center justify-center font-sans p-4">
                <div className="w-full max-w-md">
                    <div className="bg-white p-10 rounded-2xl shadow-2xl text-center border border-gray-100">
                        <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                            <Mail className="w-8 h-8 text-teal-600" />
                        </div>
                        <h2 className="text-3xl font-bold text-gray-900 mb-4">Check Your Email</h2>
                        <p className="text-gray-600 mb-6">
                            We&apos;ve sent a confirmation link to <strong className="text-teal-600">{email}</strong>.
                            Please click the link to verify your account and proceed to role selection.
                        </p>
                        <div className="space-y-4 pt-4 border-t border-gray-100">
                            <p className="text-sm text-gray-500">
                                Tip: Check your spam folder if you don&apos;t see it immediately.
                            </p>
                            <button
                                onClick={() => {
                                    setShowEmailSent(false);
                                    setIsLoginView(true);
                                    setEmail('');
                                    setPassword('');
                                    setFullName('');
                                }}
                                className="text-teal-600 hover:text-teal-700 font-semibold inline-flex items-center gap-1 transition-colors"
                            >
                                <ArrowLeft size={16} />
                                Back to Login
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Redesigned Login/Signup Form
    return (
        <div className="bg-gray-50 text-gray-800 min-h-screen flex flex-col items-center justify-center font-sans p-4">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <Link href="/" className="text-4xl font-extrabold text-teal-600 tracking-wider">Nutrishiksha</Link>
                    <h1 className="text-2xl font-bold text-gray-900 mt-4">
                        {isLoginView ? 'Sign In to Your Dashboard' : 'Create Your Account'}
                    </h1>
                    <p className="text-gray-600 mt-1">
                        {isLoginView ? 'Welcome back! Get started again.' : 'Join the platform and start your journey.'}
                    </p>
                </div>
                <div className="bg-white p-8 rounded-2xl shadow-2xl border border-gray-100">
                    <form onSubmit={handleAuthAction}>
                        {!isLoginView && (
                            <div className="mb-4">
                                <label className="block text-gray-700 font-medium mb-2" htmlFor="fullName">
                                    Full Name
                                </label>
                                <input
                                    type="text"
                                    id="fullName"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    placeholder="Your full name"
                                    className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-shadow"
                                    required
                                />
                            </div>
                        )}
                        <div className="mb-4">
                            <label className="block text-gray-700 font-medium mb-2" htmlFor="email">
                                Email
                            </label>
                            <input
                                type="email"
                                id="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="name@example.com"
                                className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-shadow"
                                required
                            />
                        </div>
                        <div className="mb-6">
                            <label className="block text-gray-700 font-medium mb-2" htmlFor="password">
                                Password
                            </label>
                            <input
                                type="password"
                                id="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder={isLoginView ? "Enter your password" : "Min 6 characters"}
                                className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-shadow"
                                required
                                minLength={6}
                            />
                        </div>
                        {error && (
                            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 shadow-sm">
                                <AlertCircle size={20} className="text-red-600 mt-0.5 flex-shrink-0" />
                                <p className="text-red-700 text-sm font-medium">{error}</p>
                            </div>
                        )}
                        <PrimaryButton isLoginView={isLoginView} loading={loading} />
                    </form>

                    <p className="text-center text-gray-600 mt-6 pt-4 border-t border-gray-100">
                        {isLoginView ? "Don&apos;t have an account?" : "Already have an account?"}
                        <button
                            onClick={() => {
                                setIsLoginView(!isLoginView);
                                setError('');
                                setEmail('');
                                setPassword('');
                                setFullName('');
                            }}
                            className="text-teal-600 hover:text-teal-700 font-bold ml-2 focus:outline-none transition-colors"
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
                    <div className="text-4xl font-bold text-teal-600">Nutrishiksha</div>
                    <div className="h-6 w-48 bg-gray-200 rounded-full mt-3 mx-auto animate-pulse"></div>
                </div>
                <div className="bg-white p-8 rounded-2xl shadow-2xl">
                    <div className="space-y-6">
                        <div className="h-12 bg-gray-200 rounded-xl animate-pulse"></div>
                        <div className="h-12 bg-gray-200 rounded-xl animate-pulse"></div>
                        <div className="h-12 bg-gray-200 rounded-xl animate-pulse"></div>
                        <div className="h-12 bg-teal-200 rounded-full animate-pulse"></div>
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