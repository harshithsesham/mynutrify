// app/auth/login/page.tsx
'use client';

import { useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import { LogIn, UserPlus } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
    const [isLoginView, setIsLoginView] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const router = useRouter();
    const supabase = createClientComponentClient();

    const handleAuthAction = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        if (isLoginView) {
            // Handle Sign In
            const { error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) setError(error.message);
            else {
                router.push('/dashboard');
                router.refresh();
            }
        } else {
            // Handle Sign Up
            const { error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: { full_name: fullName },
                    emailRedirectTo: `${location.origin}/auth/callback?next=/role-selection`,
                },
            });
            if (error) setError(error.message);
            else router.push('/check-email'); // A page telling user to check their email
        }
        setLoading(false);
    };

    return (
        <div className="bg-gray-50 text-gray-800 min-h-screen flex flex-col items-center justify-center font-sans p-4">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <Link href="/" className="text-3xl font-bold text-gray-800">Nutrify</Link>
                    <p className="text-gray-600 mt-2">{isLoginView ? 'Welcome back! Sign in to continue.' : 'Create an account to get started.'}</p>
                </div>
                <div className="bg-white p-8 rounded-2xl shadow-md">
                    <form onSubmit={handleAuthAction}>
                        {!isLoginView && (
                            <div className="mb-4">
                                <label className="block text-gray-600 font-medium mb-2" htmlFor="fullName">Full Name</label>
                                <input type="text" id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-gray-800" required />
                            </div>
                        )}
                        <div className="mb-4">
                            <label className="block text-gray-600 font-medium mb-2" htmlFor="email">Email</label>
                            <input type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-gray-800" required />
                        </div>
                        <div className="mb-6">
                            <label className="block text-gray-600 font-medium mb-2" htmlFor="password">Password</label>
                            <input type="password" id="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-gray-800" required />
                        </div>
                        {error && <p className="text-red-500 text-center mb-4">{error}</p>}
                        <button type="submit" disabled={loading} className="w-full bg-gray-800 hover:bg-gray-700 text-white font-bold py-3 px-4 rounded-lg transition duration-300 disabled:bg-gray-500 flex items-center justify-center">
                            {loading ? 'Processing...' : (isLoginView ? <><LogIn className="mr-2"/> Sign In</> : <><UserPlus className="mr-2"/> Create Account</>)}
                        </button>
                    </form>
                    <p className="text-center text-gray-600 mt-6">
                        {isLoginView ? "Don't have an account?" : "Already have an account?"}
                        <button onClick={() => { setIsLoginView(!isLoginView); setError(''); }} className="text-gray-800 hover:underline font-semibold ml-2 focus:outline-none">
                            {isLoginView ? 'Sign Up' : 'Sign In'}
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
}
