// app/dashboard/my-clients/[clientId]/plans/NutritionPlanClient.tsx
'use client';

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useCallback, useEffect, useState } from 'react';
import { Calendar, Trash2, Flame, Drumstick, Wheat, Droplets, PlusCircle, FileText, Save, ArrowLeft, User, AlertCircle, Check, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';

// --- TYPE DEFINITIONS ---
type ClientProfile = { id: string; full_name: string; };
type FoodEntry = { id: number; meal_type: 'Breakfast' | 'Lunch' | 'Snacks' | 'Dinner'; food_name: string; quantity_grams: number; calories: number; protein: number; carbs: number; fats: number; };
type Macros = { calories: number; protein: number; carbs: number; fats: number; };
type Plan = { id: number; title: string; created_at: string; creator: { full_name: string } | null; };

// Meal type icons and colors
const mealConfig = {
    Breakfast: { icon: '🌅', color: 'bg-orange-50 border-orange-200' },
    Lunch: { icon: '☀️', color: 'bg-yellow-50 border-yellow-200' },
    Snacks: { icon: '🍎', color: 'bg-green-50 border-green-200' },
    Dinner: { icon: '🌙', color: 'bg-blue-50 border-blue-200' }
};

// --- MAIN COMPONENT ---
export default function NutritionPlanClient({ clientId }: { clientId: string }) {
    const supabase = createClientComponentClient();
    const router = useRouter();
    const [client, setClient] = useState<ClientProfile | null>(null);
    const [existingPlans, setExistingPlans] = useState<Plan[]>([]);
    const [planTitle, setPlanTitle] = useState('');
    const [foodEntries, setFoodEntries] = useState<FoodEntry[]>([]);
    const [targetMacros, setTargetMacros] = useState<Macros>({ calories: 2000, protein: 150, carbs: 200, fats: 65 });
    const [isSaving, setIsSaving] = useState(false);
    const [activeTab, setActiveTab] = useState<'view' | 'create'>('view');
    const [showSuccess, setShowSuccess] = useState(false);

    // Fetch client's name and existing plans
    useEffect(() => {
        const fetchClientData = async () => {
            const { data: clientProfile } = await supabase.from('profiles').select('id, full_name').eq('id', clientId).single();
            if (clientProfile) {
                setClient(clientProfile);
                // Set default plan title with client name
                setPlanTitle(`${clientProfile.full_name}'s Nutrition Plan - ${format(new Date(), 'MMM yyyy')}`);
            }

            const { data: plansData } = await supabase.from('nutrition_plans').select(`id, title, created_at, creator:created_by_id(full_name)`).eq('assigned_to_id', clientId).order('created_at', { ascending: false });
            setExistingPlans((plansData as unknown as Plan[]) || []);
        };
        fetchClientData();
    }, [supabase, clientId]);

    // --- CRUD for Food Entries ---
    const addFoodEntry = (meal_type: FoodEntry['meal_type']) => {
        setFoodEntries([...foodEntries, {
            id: Date.now(),
            meal_type,
            food_name: '',
            quantity_grams: 100,
            calories: 0,
            protein: 0,
            carbs: 0,
            fats: 0
        }]);
    };

    const updateFoodEntry = (id: number, field: keyof FoodEntry, value: string | number) => {
        setFoodEntries(foodEntries.map(entry => entry.id === id ? { ...entry, [field]: value } : entry));
    };

    const removeFoodEntry = (id: number) => {
        setFoodEntries(foodEntries.filter(entry => entry.id !== id));
    };

    // --- Macro Calculation ---
    const consumedMacros = foodEntries.reduce((totals, entry) => {
        totals.calories += Number(entry.calories) || 0;
        totals.protein += Number(entry.protein) || 0;
        totals.carbs += Number(entry.carbs) || 0;
        totals.fats += Number(entry.fats) || 0;
        return totals;
    }, { calories: 0, protein: 0, carbs: 0, fats: 0 });

    // --- Save Plan Logic ---
    const handleSavePlan = async () => {
        if (!client) return;

        // Validation
        if (!planTitle.trim()) {
            alert("Please enter a plan title");
            return;
        }

        if (foodEntries.length === 0) {
            alert("Please add at least one food item to the plan");
            return;
        }

        setIsSaving(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            alert("You must be logged in.");
            setIsSaving(false);
            return;
        }

        const { data: coachProfile } = await supabase.from('profiles').select('id').eq('user_id', user.id).single();
        if (!coachProfile) {
            alert("Could not find your coach profile.");
            setIsSaving(false);
            return;
        }

        const { data: newPlan, error: planError } = await supabase
            .from('nutrition_plans')
            .insert({
                created_by_id: coachProfile.id,
                assigned_to_id: client.id,
                title: planTitle,
                target_calories: targetMacros.calories,
                target_protein: targetMacros.protein,
                target_carbs: targetMacros.carbs,
                target_fats: targetMacros.fats
            })
            .select()
            .single();

        if (planError || !newPlan) {
            alert("Failed to create plan: " + planError?.message);
            setIsSaving(false);
            return;
        }

        const entriesToInsert = foodEntries.map(({ id, ...entry }) => ({ ...entry, plan_id: newPlan.id }));
        const { error: entriesError } = await supabase.from('nutrition_plan_entries').insert(entriesToInsert);

        if (entriesError) {
            alert("Failed to save food entries: " + entriesError.message);
        } else {
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 3000);
        }

        setIsSaving(false);
        setActiveTab('view');

        // Refresh plans list
        const { data: plansData } = await supabase
            .from('nutrition_plans')
            .select(`id, title, created_at, creator:created_by_id(full_name)`)
            .eq('assigned_to_id', clientId)
            .order('created_at', { ascending: false });
        setExistingPlans((plansData as unknown as Plan[]) || []);

        // Reset form
        setPlanTitle(`${client.full_name}'s Nutrition Plan - ${format(new Date(), 'MMM yyyy')}`);
        setFoodEntries([]);
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="text-gray-800 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto py-6">
                {/* Header with Back Button */}
                <div className="mb-6 sm:mb-8">
                    <button
                        onClick={() => router.push('/dashboard/my-clients')}
                        className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-4 transition-colors group"
                    >
                        <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                        <span className="font-medium">Back to Clients</span>
                    </button>

                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                            <User size={24} className="text-gray-600" />
                        </div>
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-bold">
                                Nutrition Plans
                            </h1>
                            <p className="text-gray-600">Managing plans for {client?.full_name || '...'}</p>
                        </div>
                    </div>
                </div>

                {/* Success Message */}
                {showSuccess && (
                    <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3 animate-slideDown">
                        <Check className="text-green-600" size={20} />
                        <span className="text-green-800 font-medium">Nutrition plan saved successfully!</span>
                    </div>
                )}

                {/* Tab Navigation */}
                <div className="bg-white rounded-t-2xl border-b border-gray-200 px-1 pt-1">
                    <div className="flex">
                        <button
                            onClick={() => setActiveTab('view')}
                            className={`flex-1 py-3 px-4 sm:px-6 font-semibold text-sm sm:text-base rounded-t-lg transition-colors ${
                                activeTab === 'view'
                                    ? 'bg-gray-50 text-gray-800 border-b-2 border-gray-800'
                                    : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            <FileText size={18} className="inline mr-2" />
                            Existing Plans ({existingPlans.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('create')}
                            className={`flex-1 py-3 px-4 sm:px-6 font-semibold text-sm sm:text-base rounded-t-lg transition-colors ${
                                activeTab === 'create'
                                    ? 'bg-gray-50 text-gray-800 border-b-2 border-gray-800'
                                    : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            <PlusCircle size={18} className="inline mr-2" />
                            Create New Plan
                        </button>
                    </div>
                </div>

                <div className="bg-white rounded-b-2xl shadow-sm p-4 sm:p-6 lg:p-8">
                    {/* View Existing Plans Tab */}
                    {activeTab === 'view' && (
                        <div className="space-y-4">
                            {existingPlans.length > 0 ? (
                                existingPlans.map((plan) => (
                                    <Link
                                        href={`/dashboard/my-plans/${plan.id}`}
                                        key={plan.id}
                                        className="group block bg-gray-50 p-4 sm:p-6 rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 bg-white rounded-lg border border-gray-200 flex items-center justify-center group-hover:border-gray-300 transition-colors">
                                                    <FileText size={24} className="text-gray-600" />
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-lg group-hover:text-gray-900">{plan.title}</p>
                                                    <p className="text-sm text-gray-500">
                                                        Created by {plan.creator?.full_name || 'Unknown'} • {format(new Date(plan.created_at), 'dd MMM yyyy')}
                                                    </p>
                                                </div>
                                            </div>
                                            <ChevronRight size={20} className="text-gray-400 group-hover:text-gray-600 group-hover:translate-x-1 transition-all" />
                                        </div>
                                    </Link>
                                ))
                            ) : (
                                <div className="text-center py-12">
                                    <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <FileText size={40} className="text-gray-400" />
                                    </div>
                                    <h2 className="text-xl font-bold text-gray-800 mb-2">No Plans Yet</h2>
                                    <p className="text-gray-600 mb-6">Create your first nutrition plan for {client?.full_name}</p>
                                    <button
                                        onClick={() => setActiveTab('create')}
                                        className="bg-gray-800 text-white font-medium py-2 px-6 rounded-lg hover:bg-gray-700 transition-colors"
                                    >
                                        Create First Plan
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Create New Plan Tab */}
                    {activeTab === 'create' && (
                        <div className="space-y-6">
                            {/* Plan Title */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Plan Title</label>
                                <input
                                    type="text"
                                    value={planTitle}
                                    onChange={(e) => setPlanTitle(e.target.value)}
                                    className="w-full text-xl font-semibold bg-gray-50 border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-gray-800 focus:border-transparent"
                                    placeholder="Enter plan title..."
                                />
                            </div>

                            {/* Target Macros Setting */}
                            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 sm:p-6">
                                <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                                    <AlertCircle size={20} className="text-blue-600" />
                                    Set Target Macros
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

                            {/* Main Content Grid */}
                            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                                {/* Left Side: Diet Plan */}
                                <div className="xl:col-span-2 space-y-6">
                                    {/* Meal Sections */}
                                    {['Breakfast', 'Lunch', 'Snacks', 'Dinner'].map(mealType => {
                                        const config = mealConfig[mealType as keyof typeof mealConfig];
                                        const mealEntries = foodEntries.filter(e => e.meal_type === mealType);

                                        return (
                                            <div key={mealType} className={`border rounded-xl p-4 sm:p-6 ${config.color}`}>
                                                <div className="flex items-center justify-between mb-4">
                                                    <h3 className="text-lg font-semibold flex items-center gap-2">
                                                        <span className="text-2xl">{config.icon}</span>
                                                        {mealType}
                                                    </h3>
                                                    <span className="text-sm text-gray-600">
                                                        {mealEntries.reduce((sum, e) => sum + e.calories, 0)} kcal
                                                    </span>
                                                </div>

                                                {/* Food Entries */}
                                                <div className="space-y-3">
                                                    {mealEntries.map(entry => (
                                                        <div key={entry.id} className="bg-white p-4 rounded-lg border border-gray-200">
                                                            <div className="space-y-4">
                                                                <div className="flex items-start gap-3">
                                                                    <input
                                                                        type="text"
                                                                        value={entry.food_name}
                                                                        onChange={e => updateFoodEntry(entry.id, 'food_name', e.target.value)}
                                                                        placeholder="Enter food name..."
                                                                        className="flex-1 font-medium bg-transparent border-b border-gray-300 focus:outline-none focus:border-gray-800 py-1"
                                                                    />
                                                                    <button
                                                                        onClick={() => removeFoodEntry(entry.id)}
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
                                                                                onChange={e => updateFoodEntry(entry.id, 'quantity_grams', parseInt(e.target.value) || 0)}
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
                                                                            onChange={e => updateFoodEntry(entry.id, 'calories', parseInt(e.target.value) || 0)}
                                                                            className="w-full bg-gray-50 border border-gray-300 rounded-md px-3 py-2"
                                                                        />
                                                                    </div>
                                                                    <div>
                                                                        <label className="block text-xs text-gray-500 mb-1">Protein</label>
                                                                        <div className="relative">
                                                                            <input
                                                                                type="number"
                                                                                value={entry.protein}
                                                                                onChange={e => updateFoodEntry(entry.id, 'protein', parseInt(e.target.value) || 0)}
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
                                                                                onChange={e => updateFoodEntry(entry.id, 'carbs', parseInt(e.target.value) || 0)}
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
                                                                                onChange={e => updateFoodEntry(entry.id, 'fats', parseInt(e.target.value) || 0)}
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

                                {/* Right Side: Macros Summary */}
                                <div className="xl:col-span-1">
                                    <div className="bg-white p-6 rounded-xl border border-gray-200 sticky top-6">
                                        <h3 className="text-lg font-semibold mb-6">Macro Summary</h3>

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
                                            {isSaving ? 'Saving...' : 'Save Plan'}
                                        </button>

                                        {foodEntries.length === 0 && (
                                            <p className="text-xs text-gray-500 text-center mt-2">
                                                Add at least one food item to save the plan
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}