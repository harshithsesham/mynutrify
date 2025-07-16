// app/(auth)/login/page.tsx
'use client'; // Mark this as a Client Component

import { useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import { LogIn, UserPlus } from 'lucide-react';

export default function LoginPage() {
    const [isLoginView, setIsLoginView] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const router = useRouter();
    const supabase = createClientComponentClient();

    const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: fullName,
                },
                // This will redirect the user to a page to select their role after email confirmation
                emailRedirectTo: `${location.origin}/auth/callback?next=/role-selection`,
            },
        });

        if (error) {
            setError(error.message);
        } else {
            // You might want to show a "Check your email" message here
            router.push('/check-email');
        }
        setLoading(false);
    };

    const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            setError(error.message);
        } else {
            router.push('/dashboard'); // Redirect to dashboard on successful login
            router.refresh();
        }
        setLoading(false);
    };

    return (
        <div className="bg-gray-900 text-white min-h-screen flex items-center justify-center font-sans">
            <div className="max-w-md mx-auto bg-gray-800 p-8 rounded-2xl shadow-lg w-full">
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-green-400">Nutrify</h1>
                    <p className="text-gray-400">{isLoginView ? 'Welcome back!' : 'Create your account'}</p>
                </div>
                <form onSubmit={isLoginView ? handleSignIn : handleSignUp}>
                    {!isLoginView && (
                        <div className="mb-4">
                            <label className="block text-gray-400 mb-2" htmlFor="fullName">Full Name</label>
                            <input type="text" id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-green-400" required />
                        </div>
                    )}
                    <div className="mb-4">
                        <label className="block text-gray-400 mb-2" htmlFor="email">Email</label>
                        <input type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-green-400" required />
                    </div>
                    <div className="mb-6">
                        <label className="block text-gray-400 mb-2" htmlFor="password">Password</label>
                        <input type="password" id="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-green-400" required />
                    </div>
                    {error && <p className="text-red-400 text-center mb-4">{error}</p>}
                    <button type="submit" disabled={loading} className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-4 rounded-lg transition duration-300 disabled:bg-gray-500 flex items-center justify-center">
                        {loading ? 'Processing...' : (isLoginView ? <><LogIn className="mr-2"/> Sign In</> : <><UserPlus className="mr-2"/> Sign Up</>)}
                    </button>
                </form>
                <p className="text-center text-gray-400 mt-6">
                    {isLoginView ? "Don't have an account?" : "Already have an account?"}
                    <button onClick={() => { setIsLoginView(!isLoginView); setError(''); }} className="text-green-400 hover:text-green-300 font-semibold ml-2 focus:outline-none">
                        {isLoginView ? 'Sign Up' : 'Sign In'}
                    </button>
                </p>
            </div>
        </div>
    );
}