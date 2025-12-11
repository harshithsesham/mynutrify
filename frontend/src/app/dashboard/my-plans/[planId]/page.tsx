// frontend/src/app/dashboard/my-plans/[planId]/page.tsx
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import PlanDetailClient from './PlanDetailClient';
import React from 'react';

// Define the correct standard props type for a Server Component
type PageProps = {
    params: { planId: string };
};

// Define the required data structure for the plan
interface PlanData {
    id: number;
    title: string;
    created_at: string;
    assigned_to_id: string;
    target_calories?: number;
    target_protein?: number;
    target_carbs?: number;
    target_fats?: number;
    creator: { full_name: string } | null;
}

export default async function PlanDetailPage({ params }: PageProps): Promise<React.ReactElement> {
    const cookieStore = await cookies();
    const supabase = createServerComponentClient({ cookies: () => cookieStore as any });
    const planId = params.planId;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        redirect('/login');
    }

    // 1. Get Client Profile ID
    const { data: clientProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', session.user.id)
        .single();

    if (!clientProfile) {
        return redirect('/dashboard');
    }

    // 2. Fetch the plan details and its entries, ensuring all target macros are included
    const planPromise = supabase
        .from('nutrition_plans')
        .select(`
            id, 
            title, 
            created_at, 
            assigned_to_id, 
            target_calories, 
            target_protein, 
            target_carbs, 
            target_fats,
            creator:created_by_id(full_name)
        `)
        .eq('id', planId)
        .single();

    const entriesPromise = supabase
        .from('nutrition_plan_entries')
        .select('id, meal_type, food_name, quantity_grams, calories, protein, carbs, fats')
        .eq('plan_id', planId);

    const [{ data: plan, error: planError }, { data: entries, error: entriesError }] = await Promise.all([planPromise, entriesPromise]);

    if (planError || entriesError) {
        console.error("Error fetching plan details:", planError || entriesError);
        return <div className="text-red-600 p-8">Error loading plan details.</div>;
    }

    // 3. Defensive Authorization Check (Primary Fix)
    if (!plan || plan.assigned_to_id !== clientProfile.id) {
        // This handles cases where the RLS rules failed or the ID was guessed.
        return <div className="text-gray-500 p-8">Plan not found or access denied.</div>;
    }

    // Explicitly cast for type safety when passing to Client Component
    const typedPlan = plan as unknown as PlanData;

    // Render the Client Component
    return <PlanDetailClient plan={typedPlan} initialEntries={entries || []} />;
}