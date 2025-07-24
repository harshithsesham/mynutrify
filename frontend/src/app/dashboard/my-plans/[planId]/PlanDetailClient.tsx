// app/dashboard/my-plans/[planId]/PlanDetailClient.tsx
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

// Meal type configurations
const mealConfig = {
    Breakfast: { icon: '🌅', color: 'bg-orange-50 border-orange-200', textColor: 'text-orange-700' },
    Lunch: { icon: '☀️', color: 'bg-yellow-50 border-yellow-200', textColor: 'text-yellow-700' },
    Snacks: { icon: '🍎', color: 'bg-green-50 border-green-200', textColor: 'text-green-700' },
    Dinner: { icon: '🌙', color: 'bg-blue-50 border-blue-200', textColor: 'text-blue-700' }
};

// --- MAIN COMPONENT ---
export default function PlanDetailClient({ plan, initialEntries }: PlanDetailClientProps) {
    const supabase = createClientComponentClient();
    const router = useRouter();
    const [entries] = useState<FoodEntry[]>(initialEntries);
    const [userRole, setUserRole] = useState<string | null>(null);
    const [userId, setUserId] = useState<string | null>(null);
    const [isCreator, setIsCreator] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        const fetchUserRole = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('role, full_name, id')
                    .eq('user_id', user.id)
                    .single();

                if (profile) {
                    setUserRole(profile.role);
                    setUserId(profile.id);

                    // Check if user is the creator
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
    const backUrl = userRole === 'client' ? '/dashboard/my-plans' : `/dashboard/my-clients/${plan.assigned_to_id}/plans`;

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            console.log('Starting delete process for plan:', plan.id);

            // Delete all entries first (due to foreign key constraint)
            const { error: entriesError } = await supabase
                .from('nutrition_plan_entries')
                .delete()
                .eq('plan_id', plan.id);

            if (entriesError) {
                console.error('Error deleting entries:', entriesError);
                throw new Error(`Failed to delete plan entries: ${entriesError.message}`);
            }

            console.log('Entries deleted successfully');

            // Then delete the plan
            const { error: planError } = await supabase
                .from('nutrition_plans')
                .delete()
                .eq('id', plan.id);

            if (planError) {
                console.error('Error deleting plan:', planError);
                throw new Error(`Failed to delete plan: ${planError.message}`);
            }

            console.log('Plan deleted successfully');

            // Success - redirect back
            router.push(backUrl);
            router.refresh(); // Force a refresh to update the plans list

        } catch (error) {
            console.error('Delete error:', error);
            alert(`Failed to delete plan: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setIsDeleting(false);
            setShowDeleteConfirm(false);
        }
    };

    const handleExport = () => {
        // Implement export functionality (PDF/Print)
        window.print();
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                {/* Header */}
                <div className="mb-6">
                    <Link href={backUrl} className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-800 font-medium mb-4 group">
                        <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                        Back to Plans
                    </Link>

                    <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 shadow-sm">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                            <div className="flex-1">
                                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">{plan.title}</h1>
                                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                                    <span className="flex items-center gap-2">
                                        <User size={16} />
                                        {plan.creator?.full_name || 'Unknown'}
                                    </span>
                                    <span className="flex items-center gap-2">
                                        <Calendar size={16} />
                                        {format(new Date(plan.created_at), 'MMM dd, yyyy')}
                                    </span>
                                    <span className="flex items-center gap-2">
                                        <Clock size={16} />
                                        {format(new Date(plan.created_at), 'h:mm a')}
                                    </span>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handleExport}
                                    className="p-3 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-colors"
                                    title="Export Plan"
                                >
                                    <Download size={20} />
                                </button>
                                <button
                                    className="p-3 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-colors"
                                    title="Share Plan"
                                >
                                    <Share2 size={20} />
                                </button>
                                {/* Only show edit/delete if user is the creator */}
                                {isCreator && (
                                    <>
                                        <Link
                                            href={`/dashboard/my-plans/${plan.id}/edit`}
                                            className="p-3 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-colors"
                                            title="Edit Plan"
                                        >
                                            <Edit size={20} />
                                        </Link>
                                        <button
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                setShowDeleteConfirm(true);
                                            }}
                                            type="button"
                                            className="p-3 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-xl transition-colors"
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
                    <div className="lg:col-span-2 space-y-4">
                        {mealTypes.map(mealType => {
                            const mealEntries = entries.filter(e => e.meal_type === mealType);
                            if (mealEntries.length === 0) return null;

                            const config = mealConfig[mealType as keyof typeof mealConfig];
                            const mealCalories = mealEntries.reduce((sum, e) => sum + e.calories, 0);

                            return (
                                <div key={mealType} className={`bg-white rounded-xl border p-6 ${config.color} shadow-sm`}>
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-xl font-semibold flex items-center gap-2">
                                            <span className="text-2xl">{config.icon}</span>
                                            <span className={`${config.textColor} font-bold`}>{mealType}</span>
                                        </h3>
                                        <span className={`font-bold ${config.textColor} bg-white px-3 py-1 rounded-full text-sm`}>
                                            {mealCalories} kcal
                                        </span>
                                    </div>

                                    <div className="space-y-2">
                                        {mealEntries.map(entry => (
                                            <div key={entry.id} className="bg-white rounded-lg p-4 flex items-center justify-between shadow-sm border border-gray-100">
                                                <div className="flex-1">
                                                    <p className="font-bold text-gray-900 text-lg">{entry.food_name}</p>
                                                    <div className="flex items-center gap-4 mt-2 text-sm font-semibold">
                                                        <span className="text-gray-700">{entry.quantity_grams}g</span>
                                                        <span className="text-orange-600">{entry.calories} kcal</span>
                                                        <span className="text-red-600">{entry.protein}g protein</span>
                                                        <span className="text-yellow-600">{entry.carbs}g carbs</span>
                                                        <span className="text-blue-600">{entry.fats}g fats</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Right Side: Macro Summary */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-xl border border-gray-200 p-6 sticky top-6 shadow-sm">
                            <h3 className="text-xl font-bold mb-6 text-gray-900">Nutrition Summary</h3>

                            {/* Circular Progress */}
                            <div className="relative w-48 h-48 mx-auto mb-6">
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
                                        stroke="#10b981"
                                        strokeWidth="3"
                                        strokeDasharray={`${plan.target_calories ? Math.min((totalMacros.calories / plan.target_calories) * 100, 100) : 100}, 100`}
                                        className="transition-all duration-500"
                                    />
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <p className="text-3xl font-bold text-gray-900">{totalMacros.calories}</p>
                                    <p className="text-gray-600 font-semibold">
                                        {plan.target_calories ? `of ${plan.target_calories}` : ''} kcal
                                    </p>
                                </div>
                            </div>

                            {/* Macro Breakdown */}
                            <div className="space-y-4">
                                {[
                                    {
                                        icon: Drumstick,
                                        color: 'text-red-500',
                                        bg: 'bg-red-50',
                                        label: 'Protein',
                                        value: totalMacros.protein,
                                        target: plan.target_protein,
                                        unit: 'g'
                                    },
                                    {
                                        icon: Wheat,
                                        color: 'text-yellow-500',
                                        bg: 'bg-yellow-50',
                                        label: 'Carbs',
                                        value: totalMacros.carbs,
                                        target: plan.target_carbs,
                                        unit: 'g'
                                    },
                                    {
                                        icon: Droplets,
                                        color: 'text-blue-500',
                                        bg: 'bg-blue-50',
                                        label: 'Fats',
                                        value: totalMacros.fats,
                                        target: plan.target_fats,
                                        unit: 'g'
                                    }
                                ].map(macro => (
                                    <div key={macro.label}>
                                        <div className="flex justify-between items-center mb-2">
                                            <div className="flex items-center gap-2">
                                                <div className={`w-8 h-8 ${macro.bg} rounded-lg flex items-center justify-center`}>
                                                    <macro.icon size={16} className={macro.color} />
                                                </div>
                                                <span className="font-bold text-gray-900">{macro.label}</span>
                                            </div>
                                            <span className="text-sm font-bold text-gray-700">
                                                {macro.value}{macro.unit}
                                                {macro.target ? ` / ${macro.target}${macro.unit}` : ''}
                                            </span>
                                        </div>
                                        {macro.target && (
                                            <div className="w-full bg-gray-200 rounded-full h-2">
                                                <div
                                                    className={`h-2 rounded-full transition-all duration-500 ${
                                                        macro.value > macro.target ? 'bg-red-500' :
                                                            macro.label === 'Protein' ? 'bg-red-500' :
                                                                macro.label === 'Carbs' ? 'bg-yellow-500' : 'bg-blue-500'
                                                    }`}
                                                    style={{ width: `${Math.min((macro.value / macro.target) * 100, 100)}%` }}
                                                />
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {/* Daily Breakdown */}
                            <div className="mt-6 pt-6 border-t border-gray-200">
                                <h4 className="font-bold text-gray-900 mb-3">Daily Breakdown</h4>
                                <div className="space-y-2 text-sm">
                                    {mealTypes.map(mealType => {
                                        const mealCalories = entries
                                            .filter(e => e.meal_type === mealType)
                                            .reduce((sum, e) => sum + e.calories, 0);

                                        if (mealCalories === 0) return null;

                                        const percentage = totalMacros.calories > 0
                                            ? Math.round((mealCalories / totalMacros.calories) * 100)
                                            : 0;

                                        return (
                                            <div key={mealType} className="flex justify-between items-center">
                                                <span className="text-gray-700 font-semibold">{mealType}</span>
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
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
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
                                    className="ml-auto p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
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
                                    className="flex-1 py-3 px-6 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDelete}
                                    disabled={isDeleting}
                                    className="flex-1 py-3 px-6 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors disabled:bg-red-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {isDeleting ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
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