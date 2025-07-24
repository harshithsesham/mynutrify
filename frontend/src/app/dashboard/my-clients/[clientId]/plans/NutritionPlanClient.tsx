// app/dashboard/my-clients/[clientId]/plans/NutritionPlanClient.tsx
'use client';

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useCallback, useEffect, useState } from 'react';
import { Calendar, Trash2, Flame, Drumstick, Wheat, Droplets, PlusCircle, FileText, Save } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';

// --- TYPE DEFINITIONS ---
type ClientProfile = { id: string; full_name: string; };
type FoodEntry = { id: number; meal_type: 'Breakfast' | 'Lunch' | 'Snacks' | 'Dinner'; food_name: string; quantity_grams: number; calories: number; protein: number; carbs: number; fats: number; };
type Macros = { calories: number; protein: number; carbs: number; fats: number; };
type Plan = { id: number; title: string; created_at: string; creator: { full_name: string } | null; };

// --- MAIN COMPONENT ---
export default function NutritionPlanClient({ clientId }: { clientId: string }) {
    const supabase = createClientComponentClient();
    const [client, setClient] = useState<ClientProfile | null>(null);
    const [existingPlans, setExistingPlans] = useState<Plan[]>([]);
    const [planTitle, setPlanTitle] = useState('New Nutrition Plan');
    const [foodEntries, setFoodEntries] = useState<FoodEntry[]>([]);
    const [targetMacros, setTargetMacros] = useState<Macros>({ calories: 1800, protein: 158, carbs: 158, fats: 60 });
    const [isSaving, setIsSaving] = useState(false);
    const [activeTab, setActiveTab] = useState<'view' | 'create'>('view');

    // Fetch client's name and existing plans
    useEffect(() => {
        const fetchClientData = async () => {
            const { data: clientProfile } = await supabase.from('profiles').select('id, full_name').eq('id', clientId).single();
            if (clientProfile) setClient(clientProfile);

            const { data: plansData } = await supabase.from('nutrition_plans').select(`id, title, created_at, creator:created_by_id(full_name)`).eq('assigned_to_id', clientId).order('created_at', { ascending: false });
            setExistingPlans((plansData as unknown as Plan[]) || []);
        };
        fetchClientData();
    }, [supabase, clientId]);

    // --- CRUD for Food Entries ---
    const addFoodEntry = (meal_type: FoodEntry['meal_type']) => {
        setFoodEntries([...foodEntries, { id: Date.now(), meal_type, food_name: 'New Food Item', quantity_grams: 100, calories: 0, protein: 0, carbs: 0, fats: 0 }]);
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
        setIsSaving(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { alert("You must be logged in."); setIsSaving(false); return; }
        const { data: coachProfile } = await supabase.from('profiles').select('id').eq('user_id', user.id).single();
        if (!coachProfile) { alert("Could not find your coach profile."); setIsSaving(false); return; }

        const { data: newPlan, error: planError } = await supabase.from('nutrition_plans').insert({ created_by_id: coachProfile.id, assigned_to_id: client.id, title: planTitle }).select().single();
        if (planError || !newPlan) { alert("Failed to create plan: " + planError?.message); setIsSaving(false); return; }

        if (foodEntries.length > 0) {
            const entriesToInsert = foodEntries.map(({ id, ...entry }) => ({ ...entry, plan_id: newPlan.id }));
            const { error: entriesError } = await supabase.from('nutrition_plan_entries').insert(entriesToInsert);
            if (entriesError) alert("Failed to save food entries: " + entriesError.message);
            else alert("Nutrition plan saved successfully!");
        } else {
            alert("Nutrition plan saved successfully!");
        }
        setIsSaving(false);
        setActiveTab('view'); // Switch back to view tab
        // Refresh plans list
        const { data: plansData } = await supabase.from('nutrition_plans').select(`id, title, created_at, creator:created_by_id(full_name)`).eq('assigned_to_id', clientId).order('created_at', { ascending: false });
        setExistingPlans((plansData as unknown as Plan[]) || []);

        // Reset form
        setPlanTitle('New Nutrition Plan');
        setFoodEntries([]);
    };

    return (
        <div className="text-gray-800 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-6 sm:mb-8">
                <h1 className="text-2xl sm:text-3xl font-bold mb-2">
                    Nutrition Plans for {client?.full_name || '...'}
                </h1>
            </div>

            {/* Tab Navigation */}
            <div className="flex border-b border-gray-200 mb-6 sm:mb-8">
                <button
                    onClick={() => setActiveTab('view')}
                    className={`py-3 px-4 sm:px-6 font-semibold text-sm sm:text-base ${
                        activeTab === 'view'
                            ? 'border-b-2 border-gray-800 text-gray-800'
                            : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                    View Existing Plans
                </button>
                <button
                    onClick={() => setActiveTab('create')}
                    className={`py-3 px-4 sm:px-6 font-semibold text-sm sm:text-base ${
                        activeTab === 'create'
                            ? 'border-b-2 border-gray-800 text-gray-800'
                            : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                    Create New Plan
                </button>
            </div>

            {/* View Existing Plans Tab */}
            {activeTab === 'view' && (
                <div className="space-y-4 sm:space-y-6">
                    {existingPlans.length > 0 ? (
                        existingPlans.map((plan) => (
                            <Link
                                href={`/dashboard/my-plans/${plan.id}`}
                                key={plan.id}
                                className="block bg-white p-4 sm:p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
                            >
                                <div className="flex items-center gap-3 sm:gap-4">
                                    <FileText size={28} className="text-gray-400 flex-shrink-0" />
                                    <div className="min-w-0 flex-1">
                                        <p className="font-semibold text-base sm:text-lg truncate">{plan.title}</p>
                                        <p className="text-xs sm:text-sm text-gray-500">
                                            Created by {plan.creator?.full_name || 'Unknown'} on {format(new Date(plan.created_at), 'dd MMM yyyy')}
                                        </p>
                                    </div>
                                </div>
                            </Link>
                        ))
                    ) : (
                        <div className="text-center text-gray-500 py-8 sm:py-12 bg-gray-50 rounded-2xl border border-gray-200">
                            <FileText size={48} className="mx-auto text-gray-300 mb-4" />
                            <h2 className="text-xl sm:text-2xl font-bold mb-2">No Plans Yet</h2>
                            <p className="text-sm sm:text-base">Create a new plan for this client in the tab above.</p>
                        </div>
                    )}
                </div>
            )}

            {/* Create New Plan Tab */}
            {activeTab === 'create' && (
                <div className="space-y-6">
                    {/* Mobile Save Button - Top */}
                    <div className="sm:hidden">
                        <button
                            onClick={handleSavePlan}
                            disabled={isSaving}
                            className="w-full bg-gray-800 text-white font-bold py-3 px-6 rounded-lg hover:bg-gray-700 disabled:bg-gray-400 transition-colors flex items-center justify-center gap-2"
                        >
                            <Save size={20} />
                            {isSaving ? 'Saving Plan...' : 'Save Plan'}
                        </button>
                    </div>

                    {/* Desktop Save Button */}
                    <div className="hidden sm:flex justify-end">
                        <button
                            onClick={handleSavePlan}
                            disabled={isSaving}
                            className="bg-gray-800 text-white font-bold py-2 px-6 rounded-lg hover:bg-gray-700 disabled:bg-gray-400 transition-colors flex items-center gap-2"
                        >
                            <Save size={18} />
                            {isSaving ? 'Saving...' : 'Save Plan'}
                        </button>
                    </div>

                    {/* Main Content Grid */}
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 lg:gap-8">
                        {/* Left Side: Diet Plan */}
                        <div className="xl:col-span-2 bg-white p-4 sm:p-6 lg:p-8 rounded-2xl border border-gray-200 shadow-sm">
                            {/* Plan Title Input */}
                            <input
                                type="text"
                                value={planTitle}
                                onChange={(e) => setPlanTitle(e.target.value)}
                                className="text-xl sm:text-2xl font-bold w-full mb-6 bg-transparent focus:outline-none border-b border-gray-300 focus:border-gray-800 py-2"
                                placeholder="Enter plan title..."
                            />

                            {/* Meal Sections */}
                            {['Breakfast', 'Lunch', 'Snacks', 'Dinner'].map(mealType => (
                                <div key={mealType} className="mb-8 border-b border-gray-200 pb-6 last:border-b-0 last:mb-0">
                                    <h3 className="text-lg sm:text-xl font-semibold mb-4 text-gray-700">{mealType}</h3>

                                    {/* Food Entries */}
                                    <div className="space-y-3">
                                        {foodEntries.filter(e => e.meal_type === mealType).map(entry => (
                                            <div key={entry.id} className="bg-gray-50 p-3 sm:p-4 rounded-lg">
                                                {/* Mobile Layout */}
                                                <div className="sm:hidden space-y-3">
                                                    <div className="flex items-center justify-between">
                                                        <input
                                                            type="text"
                                                            value={entry.food_name}
                                                            onChange={e => updateFoodEntry(entry.id, 'food_name', e.target.value)}
                                                            placeholder="Food Name"
                                                            className="flex-1 bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm"
                                                        />
                                                        <button
                                                            onClick={() => removeFoodEntry(entry.id)}
                                                            className="text-gray-400 hover:text-red-500 ml-3 p-1"
                                                        >
                                                            <Trash2 size={18}/>
                                                        </button>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <div>
                                                            <label className="block text-xs text-gray-500 mb-1">Weight (g)</label>
                                                            <input
                                                                type="number"
                                                                value={entry.quantity_grams}
                                                                onChange={e => updateFoodEntry(entry.id, 'quantity_grams', parseInt(e.target.value) || 0)}
                                                                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs text-gray-500 mb-1">Calories</label>
                                                            <input
                                                                type="number"
                                                                value={entry.calories}
                                                                onChange={e => updateFoodEntry(entry.id, 'calories', parseInt(e.target.value) || 0)}
                                                                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm"
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="grid grid-cols-3 gap-2">
                                                        <div>
                                                            <label className="block text-xs text-gray-500 mb-1">Protein (g)</label>
                                                            <input
                                                                type="number"
                                                                value={entry.protein}
                                                                onChange={e => updateFoodEntry(entry.id, 'protein', parseInt(e.target.value) || 0)}
                                                                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs text-gray-500 mb-1">Carbs (g)</label>
                                                            <input
                                                                type="number"
                                                                value={entry.carbs}
                                                                onChange={e => updateFoodEntry(entry.id, 'carbs', parseInt(e.target.value) || 0)}
                                                                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs text-gray-500 mb-1">Fats (g)</label>
                                                            <input
                                                                type="number"
                                                                value={entry.fats}
                                                                onChange={e => updateFoodEntry(entry.id, 'fats', parseInt(e.target.value) || 0)}
                                                                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Desktop Layout */}
                                                <div className="hidden sm:grid sm:grid-cols-6 gap-3 items-center">
                                                    <input
                                                        type="text"
                                                        value={entry.food_name}
                                                        onChange={e => updateFoodEntry(entry.id, 'food_name', e.target.value)}
                                                        placeholder="Food Name"
                                                        className="col-span-2 bg-white border border-gray-300 rounded-lg px-3 py-2"
                                                    />
                                                    <input
                                                        type="number"
                                                        value={entry.quantity_grams}
                                                        onChange={e => updateFoodEntry(entry.id, 'quantity_grams', parseInt(e.target.value) || 0)}
                                                        placeholder="g"
                                                        className="bg-white border border-gray-300 rounded-lg px-3 py-2"
                                                    />
                                                    <input
                                                        type="number"
                                                        value={entry.calories}
                                                        onChange={e => updateFoodEntry(entry.id, 'calories', parseInt(e.target.value) || 0)}
                                                        placeholder="kcal"
                                                        className="bg-white border border-gray-300 rounded-lg px-3 py-2"
                                                    />
                                                    <input
                                                        type="number"
                                                        value={entry.protein}
                                                        onChange={e => updateFoodEntry(entry.id, 'protein', parseInt(e.target.value) || 0)}
                                                        placeholder="p"
                                                        className="bg-white border border-gray-300 rounded-lg px-3 py-2"
                                                    />
                                                    <button
                                                        onClick={() => removeFoodEntry(entry.id)}
                                                        className="text-gray-400 hover:text-red-500 justify-self-center"
                                                    >
                                                        <Trash2 size={20}/>
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Add Food Button */}
                                    <button
                                        onClick={() => addFoodEntry(mealType as FoodEntry['meal_type'])}
                                        className="flex items-center gap-2 text-gray-600 hover:text-gray-800 font-semibold mt-4 transition-colors"
                                    >
                                        <PlusCircle size={20}/> Add Food
                                    </button>
                                </div>
                            ))}
                        </div>

                        {/* Right Side: Macros */}
                        <div className="xl:col-span-1 bg-white p-4 sm:p-6 lg:p-8 rounded-2xl border border-gray-200 shadow-sm h-fit">
                            <h3 className="text-lg sm:text-xl font-semibold mb-6">Total Macros</h3>

                            {/* Circular Progress */}
                            <div className="relative w-32 h-32 sm:w-40 sm:h-40 lg:w-48 lg:h-48 mx-auto mb-6">
                                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                                    {/* Background circle */}
                                    <path
                                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                        fill="none"
                                        stroke="#eee"
                                        strokeWidth="3"
                                    />
                                    {/* Progress circle */}
                                    <path
                                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                        fill="none"
                                        stroke="#4ade80"
                                        strokeWidth="3"
                                        strokeDasharray={`${Math.min((consumedMacros.calories / targetMacros.calories) * 100, 100)}, 100`}
                                        className="transition-all duration-300"
                                    />
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <p className="text-2xl sm:text-3xl font-bold">{consumedMacros.calories}</p>
                                    <p className="text-gray-500 text-sm">kcal</p>
                                </div>
                            </div>

                            {/* Macro Breakdown */}
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        <Flame size={18} className="text-orange-500" />
                                        <span className="font-medium text-sm sm:text-base">Calories</span>
                                    </div>
                                    <span className="text-gray-500 text-sm">{consumedMacros.calories} / {targetMacros.calories} kcal</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        <Drumstick size={18} className="text-red-500" />
                                        <span className="font-medium text-sm sm:text-base">Protein</span>
                                    </div>
                                    <span className="text-gray-500 text-sm">{consumedMacros.protein} / {targetMacros.protein} g</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        <Wheat size={18} className="text-yellow-500" />
                                        <span className="font-medium text-sm sm:text-base">Carbs</span>
                                    </div>
                                    <span className="text-gray-500 text-sm">{consumedMacros.carbs} / {targetMacros.carbs} g</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        <Droplets size={18} className="text-blue-500" />
                                        <span className="font-medium text-sm sm:text-base">Fats</span>
                                    </div>
                                    <span className="text-gray-500 text-sm">{consumedMacros.fats} / {targetMacros.fats} g</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Mobile Save Button - Bottom */}
                    <div className="sm:hidden">
                        <button
                            onClick={handleSavePlan}
                            disabled={isSaving}
                            className="w-full bg-gray-800 text-white font-bold py-4 px-6 rounded-lg hover:bg-gray-700 disabled:bg-gray-400 transition-colors flex items-center justify-center gap-2 text-lg"
                        >
                            <Save size={22} />
                            {isSaving ? 'Saving Plan...' : 'Save Plan'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}