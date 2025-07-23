// app/dashboard/my-plans/[planId]/PlanDetailClient.tsx
'use client';

import { useState } from 'react';
import { Calendar, Flame, Drumstick, Wheat, Droplets } from 'lucide-react';
import { format } from 'date-fns';

// --- TYPE DEFINITIONS ---
type Plan = {
    id: number;
    title: string;
    created_at: string;
    creator: { full_name: string } | null;
};

type FoodEntry = {
    id: number;
    meal_type: string;
    food_name: string;
    quantity_grams: number;
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
};

interface PlanDetailClientProps {
    plan: Plan;
    initialEntries: FoodEntry[];
}

// --- MAIN COMPONENT ---
export default function PlanDetailClient({ plan, initialEntries }: PlanDetailClientProps) {
    const [entries] = useState<FoodEntry[]>(initialEntries);

    const totalMacros = entries.reduce((totals, entry) => {
        totals.calories += Number(entry.calories) || 0;
        totals.protein += Number(entry.protein) || 0;
        totals.carbs += Number(entry.carbs) || 0;
        totals.fats += Number(entry.fats) || 0;
        return totals;
    }, { calories: 0, protein: 0, carbs: 0, fats: 0 });

    const mealTypes = ['Breakfast', 'Lunch', 'Snacks', 'Dinner'];

    return (
        <div className="text-gray-800">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold">{plan.title}</h1>
                    <p className="text-gray-500">
                        Created by {plan.creator?.full_name || 'Unknown'} on {format(new Date(plan.created_at), 'dd MMM yyyy')}
                    </p>
                </div>
                <div className="flex items-center gap-2 bg-white border border-gray-200 p-2 rounded-lg">
                    <Calendar size={20} className="text-gray-500" />
                    <span>{format(new Date(), 'MMM dd, yyyy')}</span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Side: Diet Plan */}
                <div className="lg:col-span-2 bg-white p-8 rounded-2xl border border-gray-200 shadow-sm">
                    {mealTypes.map(mealType => {
                        const mealEntries = entries.filter(e => e.meal_type === mealType);
                        if (mealEntries.length === 0) return null;

                        return (
                            <div key={mealType} className="mb-6 border-b border-gray-200 pb-6 last:border-b-0">
                                <h3 className="text-xl font-semibold mb-4">{mealType}</h3>
                                <div className="space-y-3">
                                    {mealEntries.map(entry => (
                                        <div key={entry.id} className="grid grid-cols-5 gap-4 items-center p-3 bg-gray-50 rounded-lg">
                                            <p className="col-span-2 font-medium">{entry.food_name}</p>
                                            <p className="text-gray-600">{entry.quantity_grams} gm</p>
                                            <p className="text-gray-600">{entry.calories} kcal</p>
                                            <p className="text-gray-600">{entry.protein} p</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Right Side: Macros */}
                <div className="lg:col-span-1 bg-white p-8 rounded-2xl border border-gray-200 shadow-sm self-start">
                    <h3 className="text-xl font-semibold mb-6">Total Macros</h3>
                    <div className="relative w-48 h-48 mx-auto mb-6">
                        <svg className="w-full h-full" viewBox="0 0 36 36">
                            <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#eee" strokeWidth="3" />
                            {/* Placeholder for progress */}
                            <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#4ade80" strokeWidth="3" strokeDasharray="100, 100" />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <p className="text-3xl font-bold">{totalMacros.calories}</p>
                            <p className="text-gray-500">kcal</p>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center"><div className="flex items-center gap-3"><Flame size={20} className="text-orange-500" /><span className="font-medium">Calories</span></div><span className="text-gray-500">{totalMacros.calories} kcal</span></div>
                        <div className="flex justify-between items-center"><div className="flex items-center gap-3"><Drumstick size={20} className="text-red-500" /><span className="font-medium">Protein</span></div><span className="text-gray-500">{totalMacros.protein} gm</span></div>
                        <div className="flex justify-between items-center"><div className="flex items-center gap-3"><Wheat size={20} className="text-yellow-500" /><span className="font-medium">Carbs</span></div><span className="text-gray-500">{totalMacros.carbs} gm</span></div>
                        <div className="flex justify-between items-center"><div className="flex items-center gap-3"><Droplets size={20} className="text-blue-500" /><span className="font-medium">Fats</span></div><span className="text-gray-500">{totalMacros.fats} gm</span></div>
                    </div>
                </div>
            </div>
        </div>
    );
}
