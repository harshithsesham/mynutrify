// app/role-selection/page.tsx
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
            const { error } = await supabase
                .from('profiles')
                .update({ role: role, updated_at: new Date().toISOString() })
                .eq('user_id', user.id);

            if (error) {
                alert('Error saving your role: ' + error.message);
                console.error('Error updating role:', error);
                setLoading(false);
            } else {
                router.push('/dashboard');
                router.refresh();
            }
        } else {
            setLoading(false);
        }
    };

    const roles = [
        { name: 'Client', icon: <Users size={32} />, description: "Track your meals and progress." },
        { name: 'Nutritionist', icon: <Apple size={32} />, description: "Manage your clients and their plans." },
        { name: 'Trainer', icon: <Dumbbell size={32} />, description: "Oversee workouts and client fitness." },
    ];

    return (
        <div className="bg-gray-50 text-gray-800 min-h-screen flex items-center justify-center font-sans p-4">
            <div className="text-center max-w-4xl w-full">
                <h1 className="text-5xl font-bold mb-4">One Last Step!</h1>
                <p className="text-xl text-gray-600 mb-12">How will you be using Nutrify?</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {roles.map((role) => (
                        <button
                            key={role.name}
                            onClick={() => handleSelectRole(role.name.toLowerCase())}
                            disabled={loading}
                            className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col items-center justify-center aspect-square disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <div className="text-gray-800 mb-4">{role.icon}</div>
                            <h2 className="text-2xl font-semibold text-gray-800">{role.name}</h2>
                            <p className="text-gray-600 mt-2">{role.description}</p>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
