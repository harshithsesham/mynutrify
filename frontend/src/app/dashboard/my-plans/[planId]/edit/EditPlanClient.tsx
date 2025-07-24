// app/dashboard/my-plans/[planId]/edit/EditPlanClient.tsx
'use client';

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Trash2, Drumstick, Wheat, Droplets, PlusCircle, Save, ArrowLeft, AlertCircle, Check, Loader2 } from 'lucide-react';

// --- TYPE DEFINITIONS ---
type FoodEntry = {
    id?: number;
    temp_id?: string;
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
    Breakfast: { icon: '🌅', color: 'bg-orange-50 border-orange-200', darkColor: 'bg-orange-100' },
    Lunch: { icon: '☀️', color: 'bg-yellow-50 border-yellow-200', darkColor: 'bg-yellow-100' },
    Snacks: { icon: '🍎', color: 'bg-green-50 border-green-200', darkColor: 'bg-green-100' },
    Dinner: { icon: '🌙', color: 'bg-blue-50 border-blue-200', darkColor: 'bg-blue-100' }
};

interface EditPlanClientProps {
    plan: Plan;
    initialEntries: FoodEntry[];
}

// --- MAIN COMPONENT ---
export default function EditPlanClient({ plan, initialEntries }: EditPlanClientProps) {
    const supabase = createClientComponentClient();
    const router = useRouter();

    // State management
    const [planTitle, setPlanTitle] = useState(plan.title);
    const [foodEntries, setFoodEntries] = useState<FoodEntry[]>(
        initialEntries.map(entry => ({
            ...entry,
            temp_id: entry.id ? `existing_${entry.id}` : `new_${Date.now()}_${Math.random()}`
        }))
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
    const [isLoading, setIsLoading] = useState(true);
    const [canEdit, setCanEdit] = useState(false);

    // Check permissions
    useEffect(() => {
        const checkPermission = async () => {
            try {
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

                const { data: planData } = await supabase
                    .from('nutrition_plans')
                    .select('created_by_id')
                    .eq('id', plan.id)
                    .single();

                const isCreator = planData?.created_by_id === profile.id;

                if (!isCreator && profile.role === 'client') {
                    router.push(`/dashboard/my-plans/${plan.id}`);
                    return;
                }

                setCanEdit(true);
            } catch (error) {
                console.error('Permission check error:', error);
                setErrors(['Failed to verify permissions']);
            } finally {
                setIsLoading(false);
            }
        };

        checkPermission();
    }, [supabase, router, plan.id]);

    // --- CRUD for Food Entries ---
    const addFoodEntry = (meal_type: FoodEntry['meal_type']) => {
        const newEntry: FoodEntry = {
            temp_id: `new_${Date.now()}_${Math.random()}`,
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

    const updateFoodEntry = (temp_id: string, field: keyof FoodEntry, value: string | number) => {
        setFoodEntries(foodEntries.map(entry =>
            entry.temp_id === temp_id ? { ...entry, [field]: value } : entry
        ));
    };

    const removeFoodEntry = (temp_id: string) => {
        const entryToRemove = foodEntries.find(entry => entry.temp_id === temp_id);

        if (entryToRemove?.id) {
            setDeletedEntryIds([...deletedEntryIds, entryToRemove.id]);
        }

        setFoodEntries(foodEntries.filter(entry => entry.temp_id !== temp_id));
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
                    title: planTitle.trim(),
                    target_calories: Number(targetMacros.calories),
                    target_protein: Number(targetMacros.protein),
                    target_carbs: Number(targetMacros.carbs),
                    target_fats: Number(targetMacros.fats)
                })
                .eq('id', plan.id);

            if (planError) {
                console.error('Plan update error:', planError);
                throw new Error(`Failed to update plan: ${planError.message}`);
            }

            // Delete removed entries
            if (deletedEntryIds.length > 0) {
                const { error: deleteError } = await supabase
                    .from('nutrition_plan_entries')
                    .delete()
                    .in('id', deletedEntryIds);

                if (deleteError) {
                    console.error('Delete entries error:', deleteError);
                    throw new Error(`Failed to delete entries: ${deleteError.message}`);
                }
            }

            // Separate existing and new entries
            const entriesToUpdate = foodEntries.filter(e => e.id && !deletedEntryIds.includes(e.id));
            const entriesToInsert = foodEntries.filter(e => !e.id);

            // Update existing entries
            for (const entry of entriesToUpdate) {
                const { error } = await supabase
                    .from('nutrition_plan_entries')
                    .update({
                        meal_type: entry.meal_type,
                        food_name: entry.food_name.trim(),
                        quantity_grams: Number(entry.quantity_grams),
                        calories: Number(entry.calories),
                        protein: Number(entry.protein),
                        carbs: Number(entry.carbs),
                        fats: Number(entry.fats),
                    })
                    .eq('id', entry.id!);

                if (error) {
                    console.error('Entry update error:', error);
                    throw new Error(`Failed to update entry: ${error.message}`);
                }
            }

            // Insert new entries
            if (entriesToInsert.length > 0) {
                const newEntries = entriesToInsert.map(entry => ({
                    plan_id: plan.id,
                    meal_type: entry.meal_type,
                    food_name: entry.food_name.trim(),
                    quantity_grams: Number(entry.quantity_grams),
                    calories: Number(entry.calories),
                    protein: Number(entry.protein),
                    carbs: Number(entry.carbs),
                    fats: Number(entry.fats),
                }));

                const { error } = await supabase
                    .from('nutrition_plan_entries')
                    .insert(newEntries);

                if (error) {
                    console.error('Entry insert error:', error);
                    throw new Error(`Failed to insert entries: ${error.message}`);
                }
            }

            setShowSuccess(true);
            setTimeout(() => {
                router.push(`/dashboard/my-plans/${plan.id}`);
            }, 1500);

        } catch (error) {
            console.error('Save error:', error);
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
                    <Loader2 className="animate-spin h-12 w-12 text-blue-600 mx-auto mb-4" />
                    <p className="text-gray-600">Loading plan...</p>
                </div>
            </div>
        );
    }

    if (!canEdit) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
                    <p className="text-gray-600">You don&apos;t have permission to edit this plan.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="mb-8">
                    <button
                        onClick={() => router.push(`/dashboard/my-plans/${plan.id}`)}
                        className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-6 transition-colors group"
                    >
                        <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                        <span className="font-medium">Cancel Edit</span>
                    </button>

                    <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
                        <h1 className="text-3xl font-bold text-gray-900 mb-8">
                            Edit Nutrition Plan
                        </h1>

                        {/* Plan Title Input */}
                        <div className="mb-8">
                            <label className="block text-sm font-semibold text-gray-700 mb-3">
                                Plan Name
                            </label>
                            <input
                                type="text"
                                value={planTitle}
                                onChange={(e) => setPlanTitle(e.target.value)}
                                className="w-full text-xl font-medium bg-gray-50 border-2 border-gray-200 rounded-xl px-6 py-4 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                placeholder="Enter plan name..."
                            />
                        </div>

                        {/* Target Macros */}
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl p-8">
                            <h3 className="font-bold text-xl mb-6 flex items-center gap-3 text-blue-900">
                                <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center">
                                    <AlertCircle size={20} className="text-white" />
                                </div>
                                Daily Targets
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Calories</label>
                                    <input
                                        type="number"
                                        value={targetMacros.calories}
                                        onChange={(e) => setTargetMacros({...targetMacros, calories: parseInt(e.target.value) || 0})}
                                        className="w-full bg-white border-2 border-gray-400 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg font-bold text-gray-900"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Protein (g)</label>
                                    <input
                                        type="number"
                                        value={targetMacros.protein}
                                        onChange={(e) => setTargetMacros({...targetMacros, protein: parseInt(e.target.value) || 0})}
                                        className="w-full bg-white border-2 border-gray-400 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg font-bold text-gray-900"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Carbs (g)</label>
                                    <input
                                        type="number"
                                        value={targetMacros.carbs}
                                        onChange={(e) => setTargetMacros({...targetMacros, carbs: parseInt(e.target.value) || 0})}
                                        className="w-full bg-white border-2 border-gray-400 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg font-bold text-gray-900"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Fats (g)</label>
                                    <input
                                        type="number"
                                        value={targetMacros.fats}
                                        onChange={(e) => setTargetMacros({...targetMacros, fats: parseInt(e.target.value) || 0})}
                                        className="w-full bg-white border-2 border-gray-400 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg font-bold text-gray-900"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Success Message */}
                {showSuccess && (
                    <div className="mb-8 bg-green-50 border-2 border-green-200 rounded-2xl p-6 flex items-center gap-4 shadow-sm">
                        <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center">
                            <Check className="text-white" size={20} />
                        </div>
                        <span className="text-green-800 font-semibold text-lg">Plan updated successfully! Redirecting...</span>
                    </div>
                )}

                {/* Error Messages */}
                {errors.length > 0 && (
                    <div className="mb-8 bg-red-50 border-2 border-red-200 rounded-2xl p-6 shadow-sm">
                        {errors.map((error, index) => (
                            <p key={index} className="text-red-800 font-semibold flex items-center gap-3">
                                <AlertCircle size={20} />
                                {error}
                            </p>
                        ))}
                    </div>
                )}

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
                    {/* Left Side: Meal Planning */}
                    <div className="xl:col-span-3 space-y-8">
                        {['Breakfast', 'Lunch', 'Snacks', 'Dinner'].map(mealType => {
                            const config = mealConfig[mealType as keyof typeof mealConfig];
                            const mealEntries = foodEntries.filter(e => e.meal_type === mealType);
                            const mealCalories = mealEntries.reduce((sum, e) => sum + (Number(e.calories) || 0), 0);

                            return (
                                <div key={mealType} className={`border-2 rounded-2xl p-8 shadow-lg ${config.color}`}>
                                    <div className="flex items-center justify-between mb-8">
                                        <h3 className="text-2xl font-bold flex items-center gap-4 text-gray-900">
                                            <div className={`w-12 h-12 ${config.darkColor} rounded-2xl flex items-center justify-center text-2xl`}>
                                                {config.icon}
                                            </div>
                                            {mealType}
                                        </h3>
                                        <div className="bg-white px-6 py-3 rounded-2xl shadow-sm border-2 border-gray-200">
                                            <span className="text-lg font-bold text-gray-800">{mealCalories} kcal</span>
                                        </div>
                                    </div>

                                    {/* Food Entries */}
                                    <div className="space-y-6">
                                        {mealEntries.map(entry => (
                                            <div key={entry.temp_id} className="bg-white p-8 rounded-2xl border-2 border-gray-200 shadow-sm">
                                                <div className="space-y-6">
                                                    <div className="flex items-start gap-4">
                                                        <input
                                                            type="text"
                                                            value={entry.food_name}
                                                            onChange={e => updateFoodEntry(entry.temp_id!, 'food_name', e.target.value)}
                                                            placeholder="Enter food name..."
                                                            className="flex-1 font-bold bg-white border-b-3 border-gray-500 focus:outline-none focus:border-blue-600 focus:bg-blue-50 py-3 px-2 text-xl text-gray-900 placeholder-gray-600 rounded-t-lg"
                                                        />
                                                        <button
                                                            onClick={() => removeFoodEntry(entry.temp_id!)}
                                                            type="button"
                                                            className="text-gray-500 hover:text-red-600 hover:bg-red-100 p-3 rounded-xl transition-all duration-200 flex-shrink-0"
                                                        >
                                                            <Trash2 size={20}/>
                                                        </button>
                                                    </div>

                                                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                                                        <div>
                                                            <label className="block text-sm font-bold text-gray-800 mb-2 uppercase tracking-wide">Quantity</label>
                                                            <div className="relative">
                                                                <input
                                                                    type="number"
                                                                    value={entry.quantity_grams}
                                                                    onChange={e => updateFoodEntry(entry.temp_id!, 'quantity_grams', parseInt(e.target.value) || 0)}
                                                                    className="w-full bg-gray-100 border-2 border-gray-300 rounded-xl px-4 py-3 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-bold text-gray-900 text-lg"
                                                                />
                                                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-700">g</span>
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <label className="block text-sm font-bold text-gray-800 mb-2 uppercase tracking-wide">Calories</label>
                                                            <input
                                                                type="number"
                                                                value={entry.calories}
                                                                onChange={e => updateFoodEntry(entry.temp_id!, 'calories', parseInt(e.target.value) || 0)}
                                                                className="w-full bg-gray-100 border-2 border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-bold text-gray-900 text-lg"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-sm font-bold text-gray-800 mb-2 uppercase tracking-wide">Protein</label>
                                                            <div className="relative">
                                                                <input
                                                                    type="number"
                                                                    value={entry.protein}
                                                                    onChange={e => updateFoodEntry(entry.temp_id!, 'protein', parseInt(e.target.value) || 0)}
                                                                    className="w-full bg-gray-100 border-2 border-gray-300 rounded-xl px-4 py-3 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-bold text-gray-900 text-lg"
                                                                />
                                                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-700">g</span>
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <label className="block text-sm font-bold text-gray-800 mb-2 uppercase tracking-wide">Carbs</label>
                                                            <div className="relative">
                                                                <input
                                                                    type="number"
                                                                    value={entry.carbs}
                                                                    onChange={e => updateFoodEntry(entry.temp_id!, 'carbs', parseInt(e.target.value) || 0)}
                                                                    className="w-full bg-gray-100 border-2 border-gray-300 rounded-xl px-4 py-3 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-bold text-gray-900 text-lg"
                                                                />
                                                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-700">g</span>
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <label className="block text-sm font-bold text-gray-800 mb-2 uppercase tracking-wide">Fats</label>
                                                            <div className="relative">
                                                                <input
                                                                    type="number"
                                                                    value={entry.fats}
                                                                    onChange={e => updateFoodEntry(entry.temp_id!, 'fats', parseInt(e.target.value) || 0)}
                                                                    className="w-full bg-gray-100 border-2 border-gray-300 rounded-xl px-4 py-3 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-bold text-gray-900 text-lg"
                                                                />
                                                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-700">g</span>
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
                                        className="w-full mt-6 flex items-center justify-center gap-3 text-gray-600 hover:text-gray-800 font-bold py-6 px-6 rounded-2xl border-3 border-dashed border-gray-300 hover:border-gray-400 hover:bg-white/70 transition-all text-lg"
                                    >
                                        <PlusCircle size={24}/> Add Food Item
                                    </button>
                                </div>
                            );
                        })}
                    </div>

                    {/* Right Side: Summary */}
                    <div className="xl:col-span-1">
                        <div className="bg-white rounded-2xl border-2 border-gray-200 p-8 sticky top-8 shadow-lg">
                            <h3 className="text-xl font-bold mb-8 text-gray-900">Plan Summary</h3>

                            {/* Circular Progress */}
                            <div className="relative w-48 h-48 mx-auto mb-8">
                                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                                    <path
                                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                        fill="none"
                                        stroke="#f3f4f6"
                                        strokeWidth="4"
                                    />
                                    <path
                                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                        fill="none"
                                        stroke={consumedMacros.calories > targetMacros.calories ? '#ef4444' : '#10b981'}
                                        strokeWidth="4"
                                        strokeDasharray={`${Math.min((consumedMacros.calories / targetMacros.calories) * 100, 100)}, 100`}
                                        className="transition-all duration-500"
                                    />
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <p className="text-4xl font-bold text-gray-900">{consumedMacros.calories}</p>
                                    <p className="text-gray-600 font-semibold">of {targetMacros.calories} kcal</p>
                                </div>
                            </div>

                            {/* Macro Breakdown */}
                            <div className="space-y-6">
                                {[
                                    { icon: Drumstick, color: 'text-red-500', bg: 'bg-red-50', label: 'Protein', value: consumedMacros.protein, target: targetMacros.protein, unit: 'g' },
                                    { icon: Wheat, color: 'text-yellow-500', bg: 'bg-yellow-50', label: 'Carbs', value: consumedMacros.carbs, target: targetMacros.carbs, unit: 'g' },
                                    { icon: Droplets, color: 'text-blue-500', bg: 'bg-blue-50', label: 'Fats', value: consumedMacros.fats, target: targetMacros.fats, unit: 'g' }
                                ].map(macro => (
                                    <div key={macro.label}>
                                        <div className="flex justify-between items-center mb-3">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 ${macro.bg} rounded-xl flex items-center justify-center`}>
                                                    <macro.icon size={20} className={macro.color} />
                                                </div>
                                                <span className="font-bold text-gray-900">{macro.label}</span>
                                            </div>
                                            <span className="font-bold text-gray-700">
                                                {macro.value}/{macro.target}{macro.unit}
                                            </span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-3">
                                            <div
                                                className={`h-3 rounded-full transition-all duration-500 ${
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
                                className="w-full mt-8 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold py-4 px-6 rounded-2xl hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-3 text-lg shadow-lg"
                            >
                                {isSaving ? (
                                    <>
                                        <Loader2 size={24} className="animate-spin" />
                                        Saving Changes...
                                    </>
                                ) : (
                                    <>
                                        <Save size={24} />
                                        Save Changes
                                    </>
                                )}
                            </button>

                            {foodEntries.length === 0 && (
                                <p className="text-sm text-gray-500 text-center mt-3 font-medium">
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