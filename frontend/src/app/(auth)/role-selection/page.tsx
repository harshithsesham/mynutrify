// app/(auth)/role-selection/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import { Users, Apple, Dumbbell, Loader2, AlertCircle } from 'lucide-react';

export default function RoleSelectionPage() {
    const [loading, setLoading] = useState(false);
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [checkingAuth, setCheckingAuth] = useState(true);
    const [error, setError] = useState('');
    const supabase = createClientComponentClient();
    const router = useRouter();

    // Check if user is authenticated and doesn't already have a role
    useEffect(() => {
        const checkAuth = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();

                if (!user) {
                    router.push('/login');
                    return;
                }

                // Check if user already has a profile with a role
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('user_id', user.id)
                    .single();

                if (profile?.role) {
                    // User already has a role, redirect to dashboard
                    router.push('/dashboard');
                    return;
                }

                setIsAuthorized(true);
            } catch (error) {
                console.error('Auth check error:', error);
                setError('Failed to verify authentication');
            } finally {
                setCheckingAuth(false);
            }
        };

        checkAuth();
    }, [supabase, router]);

    const handleSelectRole = async (role: string) => {
        setLoading(true);
        setError('');

        try {
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                throw new Error('No user found');
            }

            // First, try to update existing profile
            const { data: existingProfile } = await supabase
                .from('profiles')
                .select('id')
                .eq('user_id', user.id)
                .single();

            let result;

            if (existingProfile) {
                // Update existing profile
                result = await supabase
                    .from('profiles')
                    .update({
                        role: role,
                        updated_at: new Date().toISOString()
                    })
                    .eq('user_id', user.id);
            } else {
                // Create new profile
                result = await supabase
                    .from('profiles')
                    .insert({
                        user_id: user.id,
                        role: role,
                        full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    });
            }

            if (result.error) {
                throw result.error;
            }

            // Success - redirect to dashboard
            router.push('/dashboard');
            router.refresh();

        } catch (error) {
            console.error('Error saving role:', error);
            setError(error instanceof Error ? error.message : 'Failed to save role');
        } finally {
            setLoading(false);
        }
    };

    if (checkingAuth) {
        return (
            <div className="bg-gray-50 text-gray-800 min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="animate-spin h-8 w-8 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-600">Checking authentication...</p>
                </div>
            </div>
        );
    }

    if (!isAuthorized) {
        return null; // Will redirect in useEffect
    }

    const roles = [
        {
            name: 'Client',
            value: 'client',
            icon: <Users size={32} />,
            description: "Track your meals and progress.",
            color: "hover:border-gray-400 hover:bg-gray-50"
        },
        {
            name: 'Nutritionist',
            value: 'nutritionist',
            icon: <Apple size={32} />,
            description: "Manage your clients and their plans.",
            color: "hover:border-gray-400 hover:bg-gray-50"
        },
        {
            name: 'Trainer',
            value: 'trainer',
            icon: <Dumbbell size={32} />,
            description: "Oversee workouts and client fitness.",
            color: "hover:border-gray-400 hover:bg-gray-50"
        },
    ];

    return (
        <div className="bg-gray-50 text-gray-800 min-h-screen flex items-center justify-center font-sans p-4">
            <div className="text-center max-w-4xl w-full">
                <h1 className="text-5xl font-bold mb-4">One Last Step!</h1>
                <p className="text-xl text-gray-600 mb-12">How will you be using Nutrishiksha?</p>

                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 max-w-md mx-auto">
                        <AlertCircle size={16} className="text-red-500 flex-shrink-0" />
                        <p className="text-red-600 text-sm">{error}</p>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {roles.map((role) => (
                        <button
                            key={role.value}
                            onClick={() => handleSelectRole(role.value)}
                            disabled={loading}
                            className={`bg-white p-8 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col items-center justify-center aspect-square disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none ${role.color}`}
                        >
                            <div className="text-gray-800 mb-4">{role.icon}</div>
                            <h2 className="text-2xl font-semibold text-gray-800">{role.name}</h2>
                            <p className="text-gray-600 mt-2">{role.description}</p>
                            {loading && (
                                <div className="mt-4">
                                    <Loader2 className="animate-spin h-5 w-5 text-gray-600" />
                                </div>
                            )}
                        </button>
                    ))}
                </div>

                <p className="text-sm text-gray-500 mt-8">
                    Don&apos;t worry, you can change this later in your settings
                </p>
            </div>
        </div>
    );
}