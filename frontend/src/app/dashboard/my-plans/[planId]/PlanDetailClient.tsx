// src/app/dashboard/my-plans/[planId]/PlanDetailClient.tsx
'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Calendar, Flame, Drumstick, Wheat, Droplets, ChevronLeft, Clock, User, Download, Share2, Edit, Trash2, X, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

// --- TYPE DEFINITIONS ---
type Plan = {
    id: number;
    title: string;
    created_at: string;
    creator: { full_name: string } | null;
    assigned_to_id: string;
    target_calories?: number;
    target_protein?: number;
    target_carbs?: number;
    target_fats?: number;
    created_by_id?: string;
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

const mealConfig = {
    Breakfast: { icon: '🌅', color: 'bg-orange-50/50 border-orange-100', textColor: 'text-orange-800' },
    Lunch: { icon: '☀️', color: 'bg-yellow-50/50 border-yellow-100', textColor: 'text-yellow-800' },
    Snacks: { icon: '🍎', color: 'bg-green-50/50 border-green-100', textColor: 'text-green-800' },
    Dinner: { icon: '🌙', color: 'bg-blue-50/50 border-blue-100', textColor: 'text-blue-800' }
};

export default function PlanDetailClient({ plan, initialEntries }: PlanDetailClientProps) {
    const supabase = createClientComponentClient();
    const router = useRouter();
    const [entries] = useState<FoodEntry[]>(initialEntries);
    const [userId, setUserId] = useState<string | null>(null);
    const [isCreator, setIsCreator] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        const checkUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                // Get profile to check ID matches
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('id')
                    .eq('user_id', user.id)
                    .single();

                if (profile) {
                    setUserId(profile.id);
                    // Determine if current user created this plan
                    if (plan.created_by_id && plan.created_by_id === profile.id) {
                        setIsCreator(true);
                    }
                }
            }
        };
        checkUser();
    }, [plan.created_by_id, supabase]);

    const totalMacros = entries.reduce((totals, entry) => {
        totals.calories += Number(entry.calories) || 0;
        totals.protein += Number(entry.protein) || 0;
        totals.carbs += Number(entry.carbs) || 0;
        totals.fats += Number(entry.fats) || 0;
        return totals;
    }, { calories: 0, protein: 0, carbs: 0, fats: 0 });

    const mealTypes = ['Breakfast', 'Lunch', 'Snacks', 'Dinner'];

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            // Delete entries first
            await supabase.from('nutrition_plan_entries').delete().eq('plan_id', plan.id);
            // Delete plan
            const { error } = await supabase.from('nutrition_plans').delete().eq('id', plan.id);

            if (error) throw error;

            router.push('/dashboard/my-plans');
            router.refresh();
        } catch (error) {
            console.error('Delete error:', error);
            alert('Failed to delete plan.');
            setIsDeleting(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50/50 pb-20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Back Link */}
                <Link
                    href="/dashboard/my-plans"
                    className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-900 mb-6 transition-colors font-medium text-sm"
                >
                    <ChevronLeft size={16} />
                    Back to All Plans
                </Link>

                {/* Main Header Card */}
                <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 shadow-sm mb-8">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                        <div className="flex-1">
                            <h1 className="text-3xl font-bold text-gray-900 mb-3">{plan.title}</h1>
                            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                                <span className="flex items-center gap-1.5 bg-gray-100 px-3 py-1 rounded-full">
                                    <User size={14} />
                                    {plan.creator?.full_name || 'My Plan'}
                                </span>
                                <span className="flex items-center gap-1.5">
                                    <Calendar size={14} />
                                    {format(new Date(plan.created_at), 'MMMM dd, yyyy')}
                                </span>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-3">
                            <button className="p-2.5 text-gray-500 hover:bg-gray-100 rounded-lg transition-all" title="Download PDF">
                                <Download size={20} />
                            </button>

                            {isCreator && (
                                <>
                                    <Link
                                        href={`/dashboard/my-plans/${plan.id}/edit`}
                                        className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-all font-medium text-sm shadow-sm"
                                    >
                                        <Edit size={16} />
                                        Edit Plan
                                    </Link>
                                    <button
                                        onClick={() => setShowDeleteConfirm(true)}
                                        className="p-2.5 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                        title="Delete Plan"
                                    >
                                        <Trash2 size={20} />
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Meal Plan List */}
                    <div className="lg:col-span-2 space-y-6">
                        {mealTypes.map(mealType => {
                            const mealEntries = entries.filter(e => e.meal_type === mealType);
                            // Don't hide empty sections, show them as empty for better UX in "View" mode?
                            // Actually, hiding empty sections is cleaner for a "View" mode.
                            if (mealEntries.length === 0) return null;

                            const config = mealConfig[mealType as keyof typeof mealConfig];
                            const mealCalories = mealEntries.reduce((sum, e) => sum + e.calories, 0);

                            return (
                                <div key={mealType} className={`bg-white rounded-2xl border p-6 ${config.color}`}>
                                    <div className="flex items-center justify-between mb-5">
                                        <h3 className={`text-lg font-bold flex items-center gap-2 ${config.textColor}`}>
                                            <span className="text-2xl">{config.icon}</span>
                                            {mealType}
                                        </h3>
                                        <span className={`text-sm font-bold px-3 py-1 bg-white/60 rounded-lg ${config.textColor}`}>
                                            {mealCalories} kcal
                                        </span>
                                    </div>

                                    <div className="space-y-3">
                                        {mealEntries.map(entry => (
                                            <div key={entry.id} className="bg-white/80 p-4 rounded-xl border border-gray-100 flex justify-between items-center shadow-sm">
                                                <div>
                                                    <p className="font-bold text-gray-900">{entry.food_name}</p>
                                                    <p className="text-sm text-gray-500 font-medium">{entry.quantity_grams}g</p>
                                                </div>
                                                <div className="text-right text-sm">
                                                    <div className="font-bold text-gray-900">{entry.calories} kcal</div>
                                                    <div className="text-xs text-gray-500 flex gap-2 justify-end mt-0.5">
                                                        <span className="text-red-500 font-medium">{entry.protein}p</span>
                                                        <span className="text-yellow-500 font-medium">{entry.carbs}c</span>
                                                        <span className="text-blue-500 font-medium">{entry.fats}f</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}

                        {entries.length === 0 && (
                            <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-gray-300">
                                <p className="text-gray-500">No food entries added to this plan yet.</p>
                            </div>
                        )}
                    </div>

                    {/* Sidebar: Nutrition Summary */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-2xl border border-gray-200 p-6 sticky top-6 shadow-sm">
                            <h3 className="text-lg font-bold text-gray-900 mb-6">Daily Nutrition</h3>

                            {/* Donut Chart */}
                            <div className="relative w-48 h-48 mx-auto mb-8">
                                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                                    <path
                                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                        fill="none"
                                        stroke="#f1f5f9"
                                        strokeWidth="3"
                                    />
                                    <path
                                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                        fill="none"
                                        stroke="#10b981"
                                        strokeWidth="3"
                                        strokeDasharray={`${plan.target_calories ? Math.min((totalMacros.calories / plan.target_calories) * 100, 100) : 0}, 100`}
                                        className="transition-all duration-500 ease-out"
                                    />
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className="text-3xl font-extrabold text-gray-900">{totalMacros.calories}</span>
                                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wide mt-1">
                                        of {plan.target_calories || 2000} kcal
                                    </span>
                                </div>
                            </div>

                            {/* Macro Bars */}
                            <div className="space-y-5">
                                <MacroBar label="Protein" value={totalMacros.protein} target={plan.target_protein} color="bg-red-500" icon={Drumstick} />
                                <MacroBar label="Carbs" value={totalMacros.carbs} target={plan.target_carbs} color="bg-yellow-500" icon={Wheat} />
                                <MacroBar label="Fats" value={totalMacros.fats} target={plan.target_fats} color="bg-blue-500" icon={Droplets} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Delete Modal */}
                {showDeleteConfirm && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
                        <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-in fade-in zoom-in duration-200">
                            <div className="flex flex-col items-center text-center mb-6">
                                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
                                    <AlertTriangle className="text-red-600" size={24} />
                                </div>
                                <h3 className="text-lg font-bold text-gray-900">Delete Plan?</h3>
                                <p className="text-sm text-gray-500 mt-2">
                                    This action cannot be undone. This will permanently delete <strong>{plan.title}</strong>.
                                </p>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowDeleteConfirm(false)}
                                    className="flex-1 py-2.5 font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDelete}
                                    disabled={isDeleting}
                                    className="flex-1 py-2.5 font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors disabled:opacity-50"
                                >
                                    {isDeleting ? 'Deleting...' : 'Delete'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// Helper Component for Macros
function MacroBar({ label, value, target, color, icon: Icon }: any) {
    const percentage = target ? Math.min((value / target) * 100, 100) : 0;

    return (
        <div>
            <div className="flex justify-between items-center mb-2 text-sm">
                <div className="flex items-center gap-2 font-semibold text-gray-700">
                    <Icon size={16} />
                    {label}
                </div>
                <div className="font-medium text-gray-900">
                    {value}g <span className="text-gray-400">/ {target || 0}g</span>
                </div>
            </div>
            <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                <div
                    className={`h-full ${color} transition-all duration-500 rounded-full`}
                    style={{ width: `${percentage}%` }}
                />
            </div>
        </div>
    );
}