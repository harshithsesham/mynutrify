// app/(auth)/role-selection/page.tsx
'use client';

import React, { useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import { Users, Dumbbell, Apple } from 'lucide-react';

export default function RoleSelectionPage() {
    const [loading, setLoading] = useState(false);
    const supabase = createClientComponentClient();
    const router = useRouter();

    const handleSelectRole = async (role: string) => {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
            // Correctly update the profile using the 'user_id' column
            const { error } = await supabase
                .from('profiles')
                .update({ role: role, updated_at: new Date().toISOString() })
                .eq('user_id', user.id);

            if (error) {
                alert('Error saving your role: ' + error.message);
                console.error('Error updating role:', error);
            } else {
                // On success, redirect to the dashboard
                router.push('/dashboard');
                router.refresh(); // Refresh to ensure new state is loaded
            }
        }
        setLoading(false);
    };

    const roles = [
        { name: 'Client', icon: <Users size={48} />, description: "Track your meals and progress." },
        { name: 'Nutritionist', icon: <Apple size={48} />, description: "Manage your clients and their plans." },
        { name: 'Trainer', icon: <Dumbbell size={48} />, description: "Oversee workouts and client fitness." },
    ];

    return (
        <div className="bg-gray-900 text-white min-h-screen flex items-center justify-center font-sans">
            <div className="text-center p-8">
                <h1 className="text-5xl font-bold mb-4 text-white">One Last Step!</h1>
                <p className="text-xl text-gray-300 mb-12">How will you be using Nutrify?</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {roles.map((role) => (
                        <button
                            key={role.name}
                            onClick={() => handleSelectRole(role.name.toLowerCase())}
                            disabled={loading}
                            className="bg-gray-800 p-8 rounded-2xl shadow-lg hover:shadow-green-400/20 hover:bg-gray-700 transform hover:-translate-y-2 transition-all duration-300 cursor-pointer flex flex-col items-center justify-center aspect-square disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <div className="text-green-400 mb-4">{role.icon}</div>
                            <h2 className="text-2xl font-semibold text-white">{role.name}</h2>
                            <p className="text-gray-400 mt-2">{role.description}</p>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
