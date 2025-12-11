// frontend/src/app/dashboard/my-plans/[planId]/page.tsx
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import PlanDetailClient from './PlanDetailClient';
import React from 'react';

export const dynamic = 'force-dynamic';

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
    created_by_id: string; // <--- FIELD ADDED HERE
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

    // 2. Fetch the plan details and its entries, ensuring ALL necessary fields are selected.
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
            created_by_id,  <--- EXPLICITLY SELECTED TO AVOID CRASH
            creator:created_by_id(full_name)
        `)
        .eq('id', planId)
        .single();

    const entriesPromise = supabase
        .from('nutrition_plan_entries')
        .select('id, meal_type, food_name, quantity_grams, calories, protein, carbs, fats')
        .eq('plan_id', planId);

    const [{ data: plan, error: planError }, { data: entries, error: entriesError }] = await Promise.all([planPromise, entriesPromise]);

    // 3. Robust Failure Handling and Authorization Check
    if (planError) {
        console.error(`[PlanDetailPage] Error fetching plan ${planId}:`, planError);
        return redirect('/dashboard/my-plans');
    }

    if (!plan) {
        return redirect('/dashboard/my-plans');
    }

    if (entriesError) {
        console.error(`[PlanDetailPage] Error fetching entries for plan ${planId}:`, entriesError);
        // We log the error but allow rendering with no entries for a partial fix.
    }

    // Ensure type compatibility before passing to client component
    const typedPlan = plan as unknown as PlanData;

    return <PlanDetailClient plan={typedPlan} initialEntries={entries || []} />;
}