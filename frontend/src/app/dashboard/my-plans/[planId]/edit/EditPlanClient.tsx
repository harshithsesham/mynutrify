// app/dashboard/my-plans/[planId]/edit/EditPlanClient.tsx
'use client';

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Trash2, Drumstick, Wheat, Droplets, PlusCircle, Save, ArrowLeft, AlertCircle, Check, Loader2 } from 'lucide-react';

// --- TYPE DEFINITIONS ---
type FoodEntry = {
    id?: number;
    temp_id?: number;
    meal_type: 'Breakfast' | 'Lunch' | 'Snacks' | 'Dinner';
    food_name: string;
    quantity_grams: number;
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
};

type Macros = {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
};

type Plan = {
    id: number;
    title: string;
    target_calories?: number;
    target_protein?: number;
    target_carbs?: number;
    target_fats?: number;
    assigned_to_id: string;
};

// Meal configurations
const mealConfig = {
    Breakfast: { icon: '🌅', color: 'bg-orange-50 border-orange-200' },
    Lunch: { icon: '☀️', color: 'bg-yellow-50 border-yellow-200' },
    Snacks: { icon: '🍎', color: 'bg-green-50 border-green-200' },
    Dinner: { icon: '🌙', color: 'bg-blue-50 border-blue-200' }
};

interface EditPlanClientProps {
    plan: Plan;
    initialEntries: FoodEntry[];
}

// --- MAIN COMPONENT ---
export default function EditPlanClient({ plan, initialEntries }: EditPlanClientProps) {
    const supabase = createClientComponentClient();
    const router = useRouter();
    const [planTitle, setPlanTitle] = useState(plan.title);
    const [foodEntries, setFoodEntries] = useState<FoodEntry[]>(
        initialEntries.map(entry => ({ ...entry, temp_id: entry.id }))
    );
    const [targetMacros, setTargetMacros] = useState<Macros>({
        calories: plan.target_calories || 2000,
        protein: plan.target_protein || 150,
        carbs: plan.target_carbs || 200,
        fats: plan.target_fats || 65
    });
    const [isSaving, setIsSaving] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [errors, setErrors] = useState<string[]>([]);
    const [deletedEntryIds, setDeletedEntryIds] = useState<number[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // Check if user has permission to edit
    useEffect(() => {
        const checkPermission = async () => {
            setIsLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.push('/login');
                return;
            }

            const { data: profile } = await supabase
                .from('profiles')
                .select('id, role')
                .eq('user_id', user.id)
                .single();

            if (!profile) {
                router.push('/dashboard');
                return;
            }

            // Check if user is the creator or a coach for this client
            const { data: planData } = await supabase
                .from('nutrition_plans')
                .select('created_by_id')
                .eq('id', plan.id)
                .single();

            if (planData?.created_by_id !== profile.id && profile.role === 'client') {
                // Clients can only edit their own plans
                router.push(`/dashboard/my-plans/${plan.id}`);
                return;
            }
            setIsLoading(false);
        };
        checkPermission();
    }, [supabase, router, plan.id]);

    // --- CRUD for Food Entries ---
    const addFoodEntry = (meal_type: FoodEntry['meal_type']) => {
        const newEntry: FoodEntry = {
            temp_id: Date.now(),
            meal_type,
            food_name: '',
            quantity_grams: 100,
            calories: 0,
            protein: 0,
            carbs: 0,
            fats: 0,
        };
        setFoodEntries([...foodEntries, newEntry]);
    };

    const updateFoodEntry = (id: number | undefined, temp_id: number | undefined, field: keyof FoodEntry, value: string | number) => {
        setFoodEntries(foodEntries.map(entry =>
            (entry.id === id || entry.temp_id === temp_id) ? { ...entry, [field]: value } : entry
        ));
    };

    const removeFoodEntry = (id: number | undefined, temp_id: number | undefined) => {
        if (id) {
            setDeletedEntryIds([...deletedEntryIds, id]);
        }
        setFoodEntries(foodEntries.filter(entry => entry.id !== id && entry.temp_id !== temp_id));
    };

    // --- Macro Calculation ---
    const consumedMacros = foodEntries.reduce((totals, entry) => {
        totals.calories += Number(entry.calories) || 0;
        totals.protein += Number(entry.protein) || 0;
        totals.carbs += Number(entry.carbs) || 0;
        totals.fats += Number(entry.fats) || 0;
        return totals;
    }, { calories: 0, protein: 0, carbs: 0, fats: 0 });

    // --- Validation ---
    const validatePlan = () => {
        const newErrors = [];
        if (!planTitle.trim()) newErrors.push('Please enter a plan title');
        if (foodEntries.length === 0) newErrors.push('Please add at least one food item');

        const emptyFoodItems = foodEntries.filter(e => !e.food_name.trim());
        if (emptyFoodItems.length > 0) newErrors.push('Please name all food items');

        setErrors(newErrors);
        return newErrors.length === 0;
    };

    // --- Save Plan Logic ---
    const handleSavePlan = async () => {
        if (!validatePlan()) return;

        setIsSaving(true);
        setErrors([]);

        try {
            // Update plan details
            const { error: planError } = await supabase
                .from('nutrition_plans')
                .update({
                    title: planTitle,
                    target_calories: targetMacros.calories,
                    target_protein: targetMacros.protein,
                    target_carbs: targetMacros.carbs,
                    target_fats: targetMacros.fats,
                    updated_at: new Date().toISOString()
                })
                .eq('id', plan.id);

            if (planError) throw planError;

            // Delete removed entries
            if (deletedEntryIds.length > 0) {
                const { error: deleteError } = await supabase
                    .from('nutrition_plan_entries')
                    .delete()
                    .in('id', deletedEntryIds);

                if (deleteError) throw deleteError;
            }

            // Update existing entries and add new ones
            const entriesToUpdate = foodEntries.filter(e => e.id);
            const entriesToInsert = foodEntries.filter(e => !e.id);

            // Update existing entries
            for (const entry of entriesToUpdate) {
                const { error } = await supabase
                    .from('nutrition_plan_entries')
                    .update({
                        meal_type: entry.meal_type,
                        food_name: entry.food_name,
                        quantity_grams: entry.quantity_grams,
                        calories: entry.calories,
                        protein: entry.protein,
                        carbs: entry.carbs,
                        fats: entry.fats,
                    })
                    .eq('id', entry.id!);

                if (error) throw error;
            }

            // Insert new entries
            if (entriesToInsert.length > 0) {
                const newEntries = entriesToInsert.map(entry => {
                    const { temp_id: _, id: __, ...entryData } = entry;
                    return {
                        ...entryData,
                        plan_id: plan.id
                    };
                });

                const { error } = await supabase
                    .from('nutrition_plan_entries')
                    .insert(newEntries);

                if (error) throw error;
            }

            setShowSuccess(true);
            setTimeout(() => {
                router.push(`/dashboard/my-plans/${plan.id}`);
            }, 1500);

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to update plan';
            setErrors([errorMessage]);
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="animate-spin h-12 w-12 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-600">Loading plan...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                {/* Header */}
                <div className="mb-6">
                    <button
                        onClick={() => router.push(`/dashboard/my-plans/${plan.id}`)}
                        className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-4 transition-colors group"
                    >
                        <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                        <span className="font-medium">Cancel Edit</span>
                    </button>

                    <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8">
                        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-4">
                            Edit Nutrition Plan
                        </h1>

                        {/* Plan Title Input */}
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Plan Name
                            </label>
                            <input
                                type="text"
                                value={planTitle}
                                onChange={(e) => setPlanTitle(e.target.value)}
                                className="w-full text-lg font-medium bg-gray-50 border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-gray-800 focus:border-transparent"
                                placeholder="Enter plan name..."
                            />
                        </div>

                        {/* Target Macros */}
                        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                            <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                                <AlertCircle size={20} className="text-blue-600" />
                                Daily Targets
                            </h3>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Calories</label>
                                    <input
                                        type="number"
                                        value={targetMacros.calories}
                                        onChange={(e) => setTargetMacros({...targetMacros, calories: parseInt(e.target.value) || 0})}
                                        className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Protein (g)</label>
                                    <input
                                        type="number"
                                        value={targetMacros.protein}
                                        onChange={(e) => setTargetMacros({...targetMacros, protein: parseInt(e.target.value) || 0})}
                                        className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Carbs (g)</label>
                                    <input
                                        type="number"
                                        value={targetMacros.carbs}
                                        onChange={(e) => setTargetMacros({...targetMacros, carbs: parseInt(e.target.value) || 0})}
                                        className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Fats (g)</label>
                                    <input
                                        type="number"
                                        value={targetMacros.fats}
                                        onChange={(e) => setTargetMacros({...targetMacros, fats: parseInt(e.target.value) || 0})}
                                        className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Success Message */}
                {showSuccess && (
                    <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3 animate-slideDown">
                        <Check className="text-green-600" size={20} />
                        <span className="text-green-800 font-medium">Plan updated successfully! Redirecting...</span>
                    </div>
                )}

                {/* Error Messages */}
                {errors.length > 0 && (
                    <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
                        {errors.map((error, index) => (
                            <p key={index} className="text-red-800 text-sm">{error}</p>
                        ))}
                    </div>
                )}

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                    {/* Left Side: Meal Planning */}
                    <div className="xl:col-span-2 space-y-4">
                        {['Breakfast', 'Lunch', 'Snacks', 'Dinner'].map(mealType => {
                            const config = mealConfig[mealType as keyof typeof mealConfig];
                            const mealEntries = foodEntries.filter(e => e.meal_type === mealType);
                            const mealCalories = mealEntries.reduce((sum, e) => sum + e.calories, 0);

                            return (
                                <div key={mealType} className={`border rounded-xl p-6 ${config.color}`}>
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-lg font-semibold flex items-center gap-2">
                                            <span className="text-2xl">{config.icon}</span>
                                            {mealType}
                                        </h3>
                                        <span className="text-sm font-medium text-gray-600">
                                            {mealCalories} kcal
                                        </span>
                                    </div>

                                    {/* Food Entries */}
                                    <div className="space-y-3">
                                        {mealEntries.map(entry => (
                                            <div key={entry.id || entry.temp_id} className="bg-white p-4 rounded-lg border border-gray-200">
                                                <div className="space-y-4">
                                                    <div className="flex items-start gap-3">
                                                        <input
                                                            type="text"
                                                            value={entry.food_name}
                                                            onChange={e => updateFoodEntry(entry.id, entry.temp_id, 'food_name', e.target.value)}
                                                            placeholder="Enter food name..."
                                                            className="flex-1 font-medium bg-transparent border-b border-gray-300 focus:outline-none focus:border-gray-800 py-1"
                                                        />
                                                        <button
                                                            onClick={() => removeFoodEntry(entry.id, entry.temp_id)}
                                                            className="text-gray-400 hover:text-red-500 p-1"
                                                        >
                                                            <Trash2 size={18}/>
                                                        </button>
                                                    </div>

                                                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                                                        <div>
                                                            <label className="block text-xs text-gray-500 mb-1">Quantity</label>
                                                            <div className="relative">
                                                                <input
                                                                    type="number"
                                                                    value={entry.quantity_grams}
                                                                    onChange={e => updateFoodEntry(entry.id, entry.temp_id, 'quantity_grams', parseInt(e.target.value) || 0)}
                                                                    className="w-full bg-gray-50 border border-gray-300 rounded-md px-3 py-2 pr-8"
                                                                />
                                                                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500">g</span>
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs text-gray-500 mb-1">Calories</label>
                                                            <input
                                                                type="number"
                                                                value={entry.calories}
                                                                onChange={e => updateFoodEntry(entry.id, entry.temp_id, 'calories', parseInt(e.target.value) || 0)}
                                                                className="w-full bg-gray-50 border border-gray-300 rounded-md px-3 py-2"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs text-gray-500 mb-1">Protein</label>
                                                            <div className="relative">
                                                                <input
                                                                    type="number"
                                                                    value={entry.protein}
                                                                    onChange={e => updateFoodEntry(entry.id, entry.temp_id, 'protein', parseInt(e.target.value) || 0)}
                                                                    className="w-full bg-gray-50 border border-gray-300 rounded-md px-3 py-2 pr-8"
                                                                />
                                                                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500">g</span>
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs text-gray-500 mb-1">Carbs</label>
                                                            <div className="relative">
                                                                <input
                                                                    type="number"
                                                                    value={entry.carbs}
                                                                    onChange={e => updateFoodEntry(entry.id, entry.temp_id, 'carbs', parseInt(e.target.value) || 0)}
                                                                    className="w-full bg-gray-50 border border-gray-300 rounded-md px-3 py-2 pr-8"
                                                                />
                                                                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500">g</span>
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs text-gray-500 mb-1">Fats</label>
                                                            <div className="relative">
                                                                <input
                                                                    type="number"
                                                                    value={entry.fats}
                                                                    onChange={e => updateFoodEntry(entry.id, entry.temp_id, 'fats', parseInt(e.target.value) || 0)}
                                                                    className="w-full bg-gray-50 border border-gray-300 rounded-md px-3 py-2 pr-8"
                                                                />
                                                                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500">g</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Add Food Button */}
                                    <button
                                        onClick={() => addFoodEntry(mealType as FoodEntry['meal_type'])}
                                        className="w-full mt-3 flex items-center justify-center gap-2 text-gray-600 hover:text-gray-800 font-medium py-2 px-4 rounded-lg border-2 border-dashed border-gray-300 hover:border-gray-400 transition-colors"
                                    >
                                        <PlusCircle size={18}/> Add Food Item
                                    </button>
                                </div>
                            );
                        })}
                    </div>

                    {/* Right Side: Summary */}
                    <div className="xl:col-span-1">
                        <div className="bg-white rounded-xl border border-gray-200 p-6 sticky top-6">
                            <h3 className="text-lg font-semibold mb-6">Plan Summary</h3>

                            {/* Circular Progress */}
                            <div className="relative w-40 h-40 mx-auto mb-6">
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
                                        stroke={consumedMacros.calories > targetMacros.calories ? '#ef4444' : '#10b981'}
                                        strokeWidth="3"
                                        strokeDasharray={`${Math.min((consumedMacros.calories / targetMacros.calories) * 100, 100)}, 100`}
                                        className="transition-all duration-300"
                                    />
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <p className="text-3xl font-bold">{consumedMacros.calories}</p>
                                    <p className="text-gray-500 text-sm">of {targetMacros.calories} kcal</p>
                                </div>
                            </div>

                            {/* Macro Breakdown */}
                            <div className="space-y-4">
                                {[
                                    { icon: Drumstick, color: 'text-red-500', bg: 'bg-red-50', label: 'Protein', value: consumedMacros.protein, target: targetMacros.protein, unit: 'g' },
                                    { icon: Wheat, color: 'text-yellow-500', bg: 'bg-yellow-50', label: 'Carbs', value: consumedMacros.carbs, target: targetMacros.carbs, unit: 'g' },
                                    { icon: Droplets, color: 'text-blue-500', bg: 'bg-blue-50', label: 'Fats', value: consumedMacros.fats, target: targetMacros.fats, unit: 'g' }
                                ].map(macro => (
                                    <div key={macro.label}>
                                        <div className="flex justify-between items-center mb-2">
                                            <div className="flex items-center gap-2">
                                                <div className={`w-8 h-8 ${macro.bg} rounded-lg flex items-center justify-center`}>
                                                    <macro.icon size={16} className={macro.color} />
                                                </div>
                                                <span className="font-medium">{macro.label}</span>
                                            </div>
                                            <span className="text-sm text-gray-600">
                                                {macro.value}/{macro.target}{macro.unit}
                                            </span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                            <div
                                                className={`h-2 rounded-full transition-all duration-300 ${
                                                    macro.value > macro.target ? 'bg-red-500' : macro.label === 'Protein' ? 'bg-red-500' : macro.label === 'Carbs' ? 'bg-yellow-500' : 'bg-blue-500'
                                                }`}
                                                style={{ width: `${Math.min((macro.value / macro.target) * 100, 100)}%` }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Save Button */}
                            <button
                                onClick={handleSavePlan}
                                disabled={isSaving || foodEntries.length === 0}
                                className="w-full mt-6 bg-gray-800 text-white font-bold py-3 px-6 rounded-lg hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                            >
                                <Save size={20} />
                                {isSaving ? 'Saving Changes...' : 'Save Changes'}
                            </button>

                            {foodEntries.length === 0 && (
                                <p className="text-xs text-gray-500 text-center mt-2">
                                    Add at least one food item to save
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}