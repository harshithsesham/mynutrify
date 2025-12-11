// app/(auth)/role-selection/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import { Users, Apple, Dumbbell, HeartHandshake, Loader2, AlertCircle } from 'lucide-react';

export default function RoleSelectionPage() {
    const [loading, setLoading] = useState(false);
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [checkingAuth, setCheckingAuth] = useState(true);
    const [error, setError] = useState('');
    const supabase = createClientComponentClient();
    const router = useRouter();

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();

                if (!user) {
                    router.push('/login');
                    return;
                }

                const { data: profile } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('user_id', user.id)
                    .single();

                if (profile?.role) {
                    // Redirect to dashboard if role is already set
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

            const { data: existingProfile } = await supabase
                .from('profiles')
                .select('id')
                .eq('user_id', user.id)
                .single();

            let result;

            if (existingProfile) {
                result = await supabase
                    .from('profiles')
                    .update({
                        role: role,
                        updated_at: new Date().toISOString()
                    })
                    .eq('user_id', user.id);
            } else {
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

            // If health coach role, create health coach entry
            if (role === 'health_coach') {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('id')
                    .eq('user_id', user.id)
                    .single();

                if (profile) {
                    await supabase
                        .from('health_coaches')
                        .insert({
                            profile_id: profile.id
                        });
                }
            }

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
                    <Loader2 className="animate-spin h-8 w-8 text-teal-600 mx-auto mb-4" />
                    <p className="text-gray-600">Checking authentication...</p>
                </div>
            </div>
        );
    }

    if (!isAuthorized) {
        return null;
    }

    // Define roles with consistent Tailwind classes for the new theme
    const roles = [
        {
            name: 'Client',
            value: 'client',
            icon: <Users size={32} />,
            description: "Track your nutrition journey and connect with experts.",
            accent: "text-blue-600 bg-blue-50"
        },
        {
            name: 'Nutritionist',
            value: 'nutritionist',
            icon: <Apple size={32} />,
            description: "Manage your clients and create personalized nutrition plans.",
            accent: "text-teal-600 bg-teal-50"
        },
        {
            name: 'Health Coach',
            value: 'health_coach',
            icon: <HeartHandshake size={32} />,
            description: "Conduct consultations and match clients with nutritionists.",
            accent: "text-purple-600 bg-purple-50"
        },
        {
            name: 'Trainer',
            value: 'trainer',
            icon: <Dumbbell size={32} />,
            description: "Oversee workouts and client fitness.",
            accent: "text-green-600 bg-green-50"
        },
    ];

    return (
        <div className="bg-gray-50 text-gray-800 min-h-screen flex items-center justify-center font-sans p-4">
            <div className="text-center max-w-5xl w-full">
                <h1 className="text-5xl font-extrabold mb-4 text-gray-900">
                    <span className="text-teal-600">Welcome</span> to NutriShiksha!
                </h1>
                <p className="text-xl text-gray-600 mb-12">How will you be using our platform?</p>

                {error && (
                    <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 max-w-lg mx-auto shadow-sm">
                        <AlertCircle size={20} className="text-red-600 flex-shrink-0" />
                        <p className="text-red-700 text-sm font-medium">{error}</p>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {roles.map((role) => (
                        <button
                            key={role.value}
                            onClick={() => handleSelectRole(role.value)}
                            disabled={loading}
                            className={`bg-white p-8 rounded-2xl border-2 border-gray-100 shadow-xl hover:shadow-2xl hover:border-teal-400 transition-all duration-300 transform hover:-translate-y-1 cursor-pointer flex flex-col items-center justify-center h-full min-h-64 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none`}
                        >
                            <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-6 shadow-inner ${role.accent}`}>
                                {role.icon}
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900">{role.name}</h2>
                            <p className="text-gray-600 mt-2 text-sm max-w-[200px]">{role.description}</p>
                            {loading && (
                                <div className="mt-4">
                                    <Loader2 className="animate-spin h-5 w-5 text-teal-600" />
                                </div>
                            )}
                        </button>
                    ))}
                </div>

                <p className="text-sm text-gray-500 mt-8">
                    Note: You can change this later in your profile settings.
                </p>
            </div>
        </div>
    );
}