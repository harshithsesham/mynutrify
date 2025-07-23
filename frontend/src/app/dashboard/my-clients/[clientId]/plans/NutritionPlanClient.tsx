// app/dashboard/my-clients/[clientId]/plans/NutritionPlanClient.tsx
'use client';

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useCallback, useEffect, useState } from 'react';
import { Calendar, Search, Trash2, Flame, Drumstick, Wheat, Droplets, PlusCircle } from 'lucide-react';

// --- TYPE DEFINITIONS ---
type ClientProfile = {
    id: string;
    full_name: string;
};

type FoodEntry = {
    id: number; // Temporary ID for client-side rendering
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

// --- MAIN COMPONENT ---
export default function NutritionPlanClient({ clientId }: { clientId: string }) {
    const supabase = createClientComponentClient();
    const [client, setClient] = useState<ClientProfile | null>(null);
    const [planTitle, setPlanTitle] = useState('New Nutrition Plan');
    const [foodEntries, setFoodEntries] = useState<FoodEntry[]>([]);
    const [targetMacros, setTargetMacros] = useState<Macros>({ calories: 1800, protein: 158, carbs: 158, fats: 60 });
    const [isSaving, setIsSaving] = useState(false);

    // Fetch client's name
    useEffect(() => {
        const fetchClientData = async () => {
            const { data: clientProfile } = await supabase
                .from('profiles')
                .select('id, full_name')
                .eq('id', clientId)
                .single();
            if (clientProfile) {
                setClient(clientProfile);
            }
        };
        fetchClientData();
    }, [supabase, clientId]);

    // --- CRUD for Food Entries ---
    const addFoodEntry = (meal_type: FoodEntry['meal_type']) => {
        const newEntry: FoodEntry = {
            id: Date.now(), // Use timestamp as a temporary unique key
            meal_type,
            food_name: 'New Food Item',
            quantity_grams: 100,
            calories: 0,
            protein: 0,
            carbs: 0,
            fats: 0,
        };
        setFoodEntries([...foodEntries, newEntry]);
    };

    const updateFoodEntry = (id: number, field: keyof FoodEntry, value: string | number) => {
        setFoodEntries(foodEntries.map(entry =>
            entry.id === id ? { ...entry, [field]: value } : entry
        ));
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
        if (!client) {
            alert("Client not found.");
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

        // 1. Create the main plan
        const { data: newPlan, error: planError } = await supabase
            .from('nutrition_plans')
            .insert({
                created_by_id: coachProfile.id,
                assigned_to_id: client.id,
                title: planTitle,
            })
            .select()
            .single();

        if (planError || !newPlan) {
            alert("Failed to create plan: " + planError?.message);
            setIsSaving(false);
            return;
        }

        // 2. Prepare and insert all the food entries
        const entriesToInsert = foodEntries.map(({ id, ...entry }) => ({
            ...entry,
            plan_id: newPlan.id,
        }));

        if (entriesToInsert.length > 0) {
            const { error: entriesError } = await supabase
                .from('nutrition_plan_entries')
                .insert(entriesToInsert);

            if (entriesError) {
                alert("Failed to save food entries: " + entriesError.message);
            } else {
                alert("Nutrition plan saved successfully!");
            }
        } else {
            alert("Nutrition plan saved successfully!");
        }
        setIsSaving(false);
    };

    return (
        <div className="text-gray-800">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold">Diet Tool</h1>
                    <p className="text-gray-500">Nutrition plan for {client?.full_name || 'your client'}</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 bg-white border border-gray-200 p-2 rounded-lg">
                        <Calendar size={20} className="text-gray-500" />
                        <span>{new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })}</span>
                    </div>
                    <button onClick={handleSavePlan} disabled={isSaving} className="bg-gray-800 text-white font-bold py-2 px-4 rounded-lg hover:bg-gray-700 disabled:bg-gray-400">
                        {isSaving ? 'Saving...' : 'Save Plan'}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Side: Diet Plan */}
                <div className="lg:col-span-2 bg-white p-8 rounded-2xl border border-gray-200 shadow-sm">
                    {['Breakfast', 'Lunch', 'Snacks', 'Dinner'].map(mealType => (
                        <div key={mealType} className="mb-6 border-b border-gray-200 pb-6 last:border-b-0">
                            <h3 className="text-xl font-semibold mb-4">{mealType}</h3>
                            {foodEntries.filter(e => e.meal_type === mealType).map(entry => (
                                <div key={entry.id} className="grid grid-cols-6 gap-2 items-center mb-2">
                                    <input type="text" value={entry.food_name} onChange={e => updateFoodEntry(entry.id, 'food_name', e.target.value)} placeholder="Food Name" className="col-span-2 bg-gray-50 border border-gray-300 rounded-lg px-3 py-2"/>
                                    <input type="number" value={entry.quantity_grams} onChange={e => updateFoodEntry(entry.id, 'quantity_grams', parseInt(e.target.value))} placeholder="g" className="bg-gray-50 border border-gray-300 rounded-lg px-3 py-2"/>
                                    <input type="number" value={entry.calories} onChange={e => updateFoodEntry(entry.id, 'calories', parseInt(e.target.value))} placeholder="kcal" className="bg-gray-50 border border-gray-300 rounded-lg px-3 py-2"/>
                                    <input type="number" value={entry.protein} onChange={e => updateFoodEntry(entry.id, 'protein', parseInt(e.target.value))} placeholder="p" className="bg-gray-50 border border-gray-300 rounded-lg px-3 py-2"/>
                                    <button onClick={() => removeFoodEntry(entry.id)} className="text-gray-400 hover:text-red-500"><Trash2 size={20}/></button>
                                </div>
                            ))}
                            <button onClick={() => addFoodEntry(mealType as FoodEntry['meal_type'])} className="flex items-center gap-2 text-gray-600 hover:text-gray-800 font-semibold mt-4">
                                <PlusCircle size={20}/> Add Food
                            </button>
                        </div>
                    ))}
                </div>

                {/* Right Side: Macros */}
                <div className="lg:col-span-1 bg-white p-8 rounded-2xl border border-gray-200 shadow-sm self-start">
                    <h3 className="text-xl font-semibold mb-6">Update Macros</h3>
                    <div className="relative w-48 h-48 mx-auto mb-6">
                        <svg className="w-full h-full" viewBox="0 0 36 36">
                            <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#eee" strokeWidth="3" />
                            <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#4ade80" strokeWidth="3" strokeDasharray={`${(consumedMacros.calories / targetMacros.calories) * 100}, 100`} />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <p className="text-3xl font-bold">{consumedMacros.calories}</p>
                            <p className="text-gray-500">kcal</p>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center"><div className="flex items-center gap-3"><Flame size={20} className="text-orange-500" /><span className="font-medium">Calories</span></div><span className="text-gray-500">{consumedMacros.calories} / {targetMacros.calories} kcal</span></div>
                        <div className="flex justify-between items-center"><div className="flex items-center gap-3"><Drumstick size={20} className="text-red-500" /><span className="font-medium">Protein</span></div><span className="text-gray-500">{consumedMacros.protein} / {targetMacros.protein} gm</span></div>
                        <div className="flex justify-between items-center"><div className="flex items-center gap-3"><Wheat size={20} className="text-yellow-500" /><span className="font-medium">Carbs</span></div><span className="text-gray-500">{consumedMacros.carbs} / {targetMacros.carbs} gm</span></div>
                        <div className="flex justify-between items-center"><div className="flex items-center gap-3"><Droplets size={20} className="text-blue-500" /><span className="font-medium">Fats</span></div><span className="text-gray-500">{consumedMacros.fats} / {targetMacros.fats} gm</span></div>
                    </div>
                </div>
            </div>
        </div>
    );
}
