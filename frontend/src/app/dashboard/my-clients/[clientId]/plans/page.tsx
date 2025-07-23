// app/dashboard/my-clients/[clientId]/plans/page.tsx
'use client';

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useCallback, useEffect, useState } from 'react';
import { Calendar, Search, Trash2, Flame, Drumstick, Wheat, Droplets } from 'lucide-react';

// --- (Type Definitions would go here) ---

// This is a large, interactive component for creating and viewing nutrition plans.
export default function NutritionPlanPage({ params }: { params: { clientId: string } }) {
    const supabase = createClientComponentClient();
    const [clientName, setClientName] = useState('');
    // ... (More state for plans, food items, macros, etc.)

    useEffect(() => {
        // Fetch client's name and existing plans
        const fetchClientData = async () => {
            const { data: clientProfile } = await supabase
                .from('profiles')
                .select('full_name')
                .eq('id', params.clientId)
                .single();
            if (clientProfile) {
                setClientName(clientProfile.full_name);
            }
        };
        fetchClientData();
    }, [supabase, params.clientId]);

    return (
        <div className="text-gray-800">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold">Diet Tool</h1>
                    <p className="text-gray-500">Nutrition plan for {clientName || 'your client'}</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 bg-white border border-gray-200 p-2 rounded-lg">
                        <Calendar size={20} className="text-gray-500" />
                        <span>{new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })}</span>
                    </div>
                    <button className="bg-gray-800 text-white font-bold py-2 px-4 rounded-lg hover:bg-gray-700">
                        Save Plan
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Side: Diet Plan */}
                <div className="lg:col-span-2 bg-white p-8 rounded-2xl border border-gray-200 shadow-sm">
                    {['Breakfast', 'Lunch', 'Snacks', 'Dinner'].map(mealType => (
                        <div key={mealType} className="mb-6 border-b border-gray-200 pb-6">
                            <h3 className="text-xl font-semibold mb-4">{mealType}</h3>
                            <div className="relative mb-4">
                                <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input type="text" placeholder="Search Food" className="w-full bg-gray-50 border border-gray-300 rounded-lg pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-gray-800"/>
                            </div>
                            {/* Placeholder for food items */}
                            <div className="text-center text-gray-400 py-4">
                                <p>No food items added yet.</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Right Side: Macros */}
                <div className="lg:col-span-1 bg-white p-8 rounded-2xl border border-gray-200 shadow-sm self-start">
                    <h3 className="text-xl font-semibold mb-6">Update Macros</h3>
                    {/* Placeholder for Macros Donut Chart */}
                    <div className="w-48 h-48 bg-gray-100 rounded-full mx-auto flex items-center justify-center mb-6">
                        <div className="text-center">
                            <p className="text-3xl font-bold">1800</p>
                            <p className="text-gray-500">kcal</p>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <Flame size={20} className="text-orange-500" />
                                <span className="font-medium">Calories</span>
                            </div>
                            <span className="text-gray-500">0 / 1800 kcal</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <Drumstick size={20} className="text-red-500" />
                                <span className="font-medium">Protein</span>
                            </div>
                            <span className="text-gray-500">0 / 158 gm</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <Wheat size={20} className="text-yellow-500" />
                                <span className="font-medium">Carbs</span>
                            </div>
                            <span className="text-gray-500">0 / 158 gm</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <Droplets size={20} className="text-blue-500" />
                                <span className="font-medium">Fats</span>
                            </div>
                            <span className="text-gray-500">0 / 60 gm</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
