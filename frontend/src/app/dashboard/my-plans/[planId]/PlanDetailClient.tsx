// app/dashboard/my-plans/[planId]/PlanDetailClient.tsx
'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Calendar, Flame, Drumstick, Wheat, Droplets, ChevronLeft, Clock, User, Download, Share2, Edit, Trash2, X, AlertTriangle, Loader2 } from 'lucide-react';
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

// Meal type configurations (Updated colors for modern look)
const mealConfig = {
    Breakfast: { icon: '🍳', color: 'bg-orange-50 border-orange-200', textColor: 'text-orange-700' },
    Lunch: { icon: '🥗', color: 'bg-yellow-50 border-yellow-200', textColor: 'text-yellow-700' },
    Snacks: { icon: '🍇', color: 'bg-green-50 border-green-200', textColor: 'text-green-700' },
    Dinner: { icon: '🍲', color: 'bg-indigo-50 border-indigo-200', textColor: 'text-indigo-700' }
};

// --- MAIN COMPONENT ---
export default function PlanDetailClient({ plan, initialEntries }: PlanDetailClientProps) {
    const supabase = createClientComponentClient();
    const router = useRouter();
    const [entries] = useState<FoodEntry[]>(initialEntries);
    const [userRole, setUserRole] = useState<string | null>(null);
    const [isCreator, setIsCreator] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [authLoading, setAuthLoading] = useState(true);

    useEffect(() => {
        const fetchUserRole = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('role, id')
                    .eq('user_id', user.id)
                    .single();

                if (profile) {
                    setUserRole(profile.role);

                    // Check if user is the plan creator (since plan data is already loaded)
                    const { data: planData } = await supabase
                        .from('nutrition_plans')
                        .select('created_by_id')
                        .eq('id', plan.id)
                        .single();

                    if (planData) {
                        setIsCreator(planData.created_by_id === profile.id);
                    }
                }
            }
            setAuthLoading(false);
        };
        fetchUserRole();
    }, [supabase, plan.id]);

    const totalMacros = entries.reduce((totals, entry) => {
        totals.calories += Number(entry.calories) || 0;
        totals.protein += Number(entry.protein) || 0;
        totals.carbs += Number(entry.carbs) || 0;
        totals.fats += Number(entry.fats) || 0;
        return totals;
    }, { calories: 0, protein: 0, carbs: 0, fats: 0 });

    const mealTypes = ['Breakfast', 'Lunch', 'Snacks', 'Dinner'];
    // Determine back URL based on user role
    const backUrl = userRole === 'client' ? '/dashboard/my-plans' : `/dashboard/my-clients/${plan.assigned_to_id}/plans`;

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            // Delete all entries first
            const { error: entriesError } = await supabase
                .from('nutrition_plan_entries')
                .delete()
                .eq('plan_id', plan.id);

            if (entriesError) {
                throw new Error(`Failed to delete plan entries: ${entriesError.message}`);
            }

            // Then delete the plan
            const { error: planError } = await supabase
                .from('nutrition_plans')
                .delete()
                .eq('id', plan.id);

            if (planError) {
                throw new Error(`Failed to delete plan: ${planError.message}`);
            }

            // Success - redirect back
            router.push(backUrl);
            router.refresh();

        } catch (error) {
            alert(`Failed to delete plan: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setIsDeleting(false);
            setShowDeleteConfirm(false);
        }
    };

    const handleExport = () => {
        // Simple print command for basic export functionality
        window.print();
    };

    // Show a minimal loading state while role check is underway
    if (authLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 size={32} className="animate-spin text-teal-600" />
            </div>
        );
    }


    const MacroProgress = ({ icon: Icon, color, bg, label, value, target, unit }: any) => {
        const percentage = target ? Math.min((value / target) * 100, 100) : 0;
        // Determine bar color based on macro type and whether the target is exceeded
        const barColor = (() => {
            if (percentage > 100) return 'bg-red-500';
            if (label === 'Protein') return 'bg-red-500';
            if (label === 'Carbs') return 'bg-yellow-600';
            if (label === 'Fats') return 'bg-blue-600';
            return 'bg-teal-600';
        })();
        const valueColor = percentage > 100 ? 'text-red-600' : 'text-gray-900';

        return (
            <div>
                <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 ${bg} rounded-lg flex items-center justify-center`}>
                            <Icon size={16} className={color} />
                        </div>
                        <span className="font-bold text-gray-900">{label}</span>
                    </div>
                    <span className={`text-sm font-bold ${valueColor}`}>
                        {value}{unit}
                        {target ? ` / ${target}${unit}` : ''}
                    </span>
                </div>
                {target && (
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div
                            className={`h-2.5 rounded-full transition-all duration-500 ${barColor}`}
                            style={{ width: `${percentage}%` }}
                        />
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-gray-50 print:bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                {/* Header Block */}
                <div className="mb-6 print:hidden">
                    <Link href={backUrl} className="inline-flex items-center gap-2 text-gray-600 hover:text-teal-600 font-medium mb-4 group">
                        <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                        Back to Plans
                    </Link>

                    <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 shadow-xl">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                            <div className="flex-1">
                                <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-2">{plan.title}</h1>
                                <div className="flex flex-wrap items-center gap-6 text-sm text-gray-600">
                                    <span className="flex items-center gap-2 font-semibold">
                                        <User size={16} className="text-teal-500" />
                                        Created by {plan.creator?.full_name || 'Unknown'}
                                    </span>
                                    <span className="flex items-center gap-2">
                                        <Calendar size={16} className="text-teal-500" />
                                        {format(new Date(plan.created_at), 'MMM dd, yyyy')}
                                    </span>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handleExport}
                                    className="p-3 text-gray-600 hover:text-teal-600 hover:bg-teal-50 rounded-full transition-colors print:hidden"
                                    title="Download/Print Plan"
                                >
                                    <Download size={20} />
                                </button>

                                {isCreator && (
                                    <>
                                        <Link
                                            href={`/dashboard/my-plans/${plan.id}/edit`}
                                            className="p-3 text-gray-600 hover:text-teal-600 hover:bg-teal-50 rounded-full transition-colors"
                                            title="Edit Plan"
                                        >
                                            <Edit size={20} />
                                        </Link>
                                        <button
                                            onClick={() => setShowDeleteConfirm(true)}
                                            type="button"
                                            className="p-3 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-full transition-colors"
                                            title="Delete Plan"
                                        >
                                            <Trash2 size={20} />
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Side: Meal Plan Details */}
                    <div className="lg:col-span-2 space-y-6 print:w-full print:float-left">
                        {mealTypes.map(mealType => {
                            const mealEntries = entries.filter(e => e.meal_type === mealType);
                            // Only render meal types that have entries
                            if (mealEntries.length === 0) return null;

                            const config = mealConfig[mealType as keyof typeof mealConfig];
                            const mealCalories = mealEntries.reduce((sum, e) => sum + e.calories, 0);

                            return (
                                <div key={mealType} className={`bg-white rounded-2xl border-2 p-6 ${config.color} shadow-lg print:shadow-none print:border print:mb-4`}>
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-2xl font-extrabold flex items-center gap-3">
                                            <span className="text-3xl">{config.icon}</span>
                                            <span className={`${config.textColor}`}>{mealType}</span>
                                        </h3>
                                        <span className={`font-extrabold text-lg bg-white px-4 py-1.5 rounded-full shadow-inner ${config.textColor}`}>
                                            {mealCalories} kcal
                                        </span>
                                    </div>

                                    <div className="space-y-3">
                                        {mealEntries.map(entry => (
                                            <div key={entry.id} className="bg-gray-50 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between shadow-sm border border-gray-100">
                                                <p className="font-bold text-gray-900 text-lg flex-1 mb-1 sm:mb-0">{entry.food_name}</p>
                                                <div className="flex flex-wrap items-center gap-3 text-sm font-semibold text-gray-700">
                                                    <span className="text-gray-900">{entry.quantity_grams}g</span>
                                                    <span className="text-teal-600">{entry.calories} kcal</span>
                                                    <span className="text-red-500">{entry.protein}g P</span>
                                                    <span className="text-yellow-600">{entry.carbs}g C</span>
                                                    <span className="text-blue-600">{entry.fats}g F</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Right Side: Macro Summary */}
                    <div className="lg:col-span-1 print:w-1/3 print:float-right print:ml-6">
                        <div className="bg-white rounded-2xl border border-gray-200 p-6 sticky top-24 shadow-xl print:shadow-none print:border-2">
                            <h3 className="text-2xl font-bold mb-6 text-gray-900 flex items-center gap-2">
                                <Flame size={24} className="text-teal-600" />
                                Nutrition Summary
                            </h3>

                            {/* Circular Progress */}
                            {plan.target_calories && (
                                <div className="relative w-48 h-48 mx-auto mb-8">
                                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                                        <path
                                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                            fill="none"
                                            stroke="#f3f4f6"
                                            strokeWidth="3"
                                        />
                                        <path
                                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                            fill="none"
                                            stroke="#10b981" // Teal/Green
                                            strokeWidth="3"
                                            strokeDasharray={`${Math.min((totalMacros.calories / plan.target_calories) * 100, 100)}, 100`}
                                            className="transition-all duration-500"
                                        />
                                    </svg>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                        <p className="text-4xl font-extrabold text-gray-900">{totalMacros.calories}</p>
                                        <p className="text-gray-600 font-semibold text-sm">
                                            of {plan.target_calories} kcal
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Macro Breakdown */}
                            <div className="space-y-4">
                                <MacroProgress
                                    icon={Drumstick}
                                    color={'text-red-500'}
                                    bg={'bg-red-50'}
                                    label="Protein"
                                    value={totalMacros.protein}
                                    target={plan.target_protein}
                                    unit="g"
                                />
                                <MacroProgress
                                    icon={Wheat}
                                    color={'text-yellow-600'}
                                    bg={'bg-yellow-50'}
                                    label="Carbs"
                                    value={totalMacros.carbs}
                                    target={plan.target_carbs}
                                    unit="g"
                                />
                                <MacroProgress
                                    icon={Droplets}
                                    color={'text-blue-600'}
                                    bg={'bg-blue-50'}
                                    label="Fats"
                                    value={totalMacros.fats}
                                    target={plan.target_fats}
                                    unit="g"
                                />
                            </div>

                            {/* Daily Breakdown */}
                            <div className="mt-8 pt-6 border-t border-gray-200">
                                <h4 className="font-bold text-gray-900 mb-3 text-lg">Meal Summary</h4>
                                <div className="space-y-3 text-sm">
                                    {mealTypes.map(mealType => {
                                        const mealCalories = entries
                                            .filter(e => e.meal_type === mealType)
                                            .reduce((sum, e) => sum + e.calories, 0);

                                        if (mealCalories === 0) return null;

                                        const percentage = totalMacros.calories > 0
                                            ? Math.round((mealCalories / totalMacros.calories) * 100)
                                            : 0;

                                        return (
                                            <div key={mealType} className="flex justify-between items-center pb-1 border-b border-gray-100 last:border-b-0">
                                                <span className="text-gray-700 font-medium">{mealType}</span>
                                                <span className="font-bold text-gray-900">
                                                    {mealCalories} kcal ({percentage}%)
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Delete Confirmation Modal */}
                {showDeleteConfirm && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 print:hidden">
                        <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center">
                                    <AlertTriangle size={24} className="text-red-600" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900">Delete Plan?</h3>
                                    <p className="text-gray-600 text-sm">This action cannot be undone</p>
                                </div>
                                <button
                                    onClick={() => setShowDeleteConfirm(false)}
                                    className="ml-auto p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <p className="text-gray-700 mb-8 leading-relaxed">
                                Are you sure you want to delete <strong>&quot;{plan.title}&quot;</strong>?
                                This will permanently remove the plan and all its meal entries from your account.
                            </p>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowDeleteConfirm(false)}
                                    disabled={isDeleting}
                                    className="flex-1 py-3 px-6 bg-gray-200 text-gray-700 font-bold rounded-full hover:bg-gray-300 transition-colors disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDelete}
                                    disabled={isDeleting}
                                    className="flex-1 py-3 px-6 bg-red-600 text-white font-bold rounded-full hover:bg-red-700 transition-colors disabled:bg-red-400 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg"
                                >
                                    {isDeleting ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Deleting...
                                        </>
                                    ) : (
                                        <>
                                            <Trash2 size={16} />
                                            Delete Plan
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}