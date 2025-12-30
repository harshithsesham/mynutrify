'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Edit3, Target, Zap, Drumstick, Wheat, Droplets, Calendar, User } from 'lucide-react';

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

type Plan = {
    id: number;
    title: string;
    created_at: string;
    target_calories?: number;
    target_protein?: number;
    target_carbs?: number;
    target_fats?: number;
    creator?: { full_name: string } | null;
};

export default function PlanDetailClient({ plan, initialEntries }: { plan: Plan; initialEntries: FoodEntry[] }) {
    const router = useRouter();

    const mealConfig: Record<string, { icon: string; accent: string; bg: string }> = {
        Breakfast: { icon: '🌅', accent: 'text-orange-500', bg: 'border-orange-500/20' },
        Lunch: { icon: '☀️', accent: 'text-yellow-500', bg: 'border-yellow-500/20' },
        Snacks: { icon: '🍎', accent: 'text-emerald-500', bg: 'border-emerald-500/20' },
        Dinner: { icon: '🌙', accent: 'text-indigo-500', bg: 'border-indigo-500/20' }
    };

    return (
        <div className="min-h-screen bg-[#050505] text-white pb-20 selection:bg-white selection:text-black">
            {/* Sticky Header */}
            <div className="sticky top-0 z-50 bg-black/80 backdrop-blur-xl border-b border-white/10">
                <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
                    <button onClick={() => router.back()} className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors group">
                        <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                        <span className="font-bold uppercase tracking-tight">Back</span>
                    </button>
                    <button
                        onClick={() => router.push(`/dashboard/my-plans/${plan.id}/edit`)}
                        className="bg-white text-black px-8 py-2.5 rounded-full font-black uppercase tracking-tighter hover:scale-105 transition-all flex items-center gap-2"
                    >
                        <Edit3 size={18} />
                        Modify Plan
                    </button>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 py-12">
                <div className="mb-16">
                    <h1 className="text-5xl md:text-7xl font-black mb-6 tracking-tighter text-white leading-tight">
                        {plan.title}
                    </h1>
                    <div className="flex flex-wrap gap-6 text-zinc-500 font-bold uppercase text-xs tracking-widest">
                        <div className="flex items-center gap-2 bg-zinc-900/50 px-4 py-2 rounded-full border border-white/5">
                            <Calendar size={14} className="text-indigo-500" />
                            {new Date(plan.created_at).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                        </div>
                        <div className="flex items-center gap-2 bg-zinc-900/50 px-4 py-2 rounded-full border border-white/5">
                            <User size={14} className="text-emerald-500" />
                            Created by {plan.creator?.full_name || 'System'}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                    {/* Left: Meal Breakdown */}
                    <div className="lg:col-span-8 space-y-10">
                        {['Breakfast', 'Lunch', 'Snacks', 'Dinner'].map((type) => {
                            const config = mealConfig[type] || mealConfig.Breakfast;
                            const entries = initialEntries.filter(e => e.meal_type === type);
                            if (entries.length === 0) return null;

                            return (
                                <div key={type} className={`rounded-[2.5rem] border ${config.bg} bg-zinc-900/20 overflow-hidden shadow-2xl shadow-black`}>
                                    <div className="px-10 py-8 bg-white/[0.02] border-b border-white/5 flex items-center gap-4">
                                        <span className="text-3xl">{config.icon}</span>
                                        <h3 className={`text-2xl font-black uppercase tracking-widest ${config.accent}`}>{type}</h3>
                                    </div>
                                    <div className="p-8 space-y-6">
                                        {entries.map((entry) => (
                                            <div key={entry.id} className="bg-black/40 border border-white/5 rounded-3xl p-8 hover:border-white/10 transition-all">
                                                <div className="flex justify-between items-start mb-6">
                                                    <h4 className="text-2xl font-black text-white">{entry.food_name}</h4>
                                                    <span className="text-zinc-500 font-black tracking-widest uppercase text-[10px] bg-zinc-800/50 px-3 py-1 rounded-full border border-white/5">
                                                        {entry.quantity_grams}g
                                                    </span>
                                                </div>
                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                                    {[
                                                        { label: 'Energy', val: entry.calories, unit: 'kcal', color: 'text-orange-500' },
                                                        { label: 'Protein', val: entry.protein, unit: 'g', color: 'text-red-500' },
                                                        { label: 'Carbs', val: entry.carbs, unit: 'g', color: 'text-yellow-500' },
                                                        { label: 'Fats', val: entry.fats, unit: 'g', color: 'text-blue-500' }
                                                    ].map(m => (
                                                        <div key={m.label} className="bg-zinc-900/40 p-4 rounded-2xl border border-white/5">
                                                            <p className="text-[9px] font-black uppercase text-zinc-600 mb-1 tracking-tighter">{m.label}</p>
                                                            <p className="text-lg font-black text-white">{m.val}<span className="text-[10px] ml-1 text-zinc-500">{m.unit}</span></p>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Right: Summary Sidebar */}
                    <div className="lg:col-span-4">
                        <div className="sticky top-32 bg-zinc-900 border border-white/10 rounded-[3rem] p-12 shadow-2xl">
                            <div className="flex items-center gap-3 mb-12">
                                <Target className="text-blue-500" size={24} />
                                <h2 className="text-2xl font-black uppercase tracking-tighter">Total Targets</h2>
                            </div>

                            <div className="space-y-10">
                                {[
                                    { label: 'Calories', val: plan.target_calories, unit: 'kcal', icon: Zap, color: 'text-orange-500', bar: 'bg-orange-500' },
                                    { label: 'Protein', val: plan.target_protein, unit: 'g', icon: Drumstick, color: 'text-red-500', bar: 'bg-red-500' },
                                    { label: 'Carbs', val: plan.target_carbs, unit: 'g', icon: Wheat, color: 'text-yellow-500', bar: 'bg-yellow-500' },
                                    { label: 'Fats', val: plan.target_fats, unit: 'g', icon: Droplets, color: 'text-blue-500', bar: 'bg-blue-500' }
                                ].map(macro => (
                                    <div key={macro.label}>
                                        <div className="flex justify-between items-end mb-4">
                                            <div className="flex items-center gap-2">
                                                <macro.icon size={16} className={macro.color} />
                                                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{macro.label}</span>
                                            </div>
                                            <span className="text-2xl font-black">{macro.val}<span className="text-xs text-zinc-600 ml-1">{macro.unit}</span></span>
                                        </div>
                                        <div className="h-1.5 bg-black rounded-full border border-white/5 overflow-hidden">
                                            <div className={`h-full ${macro.bar} w-full opacity-50`} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}