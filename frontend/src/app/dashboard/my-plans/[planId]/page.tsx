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

    // 3. Robust Failure Handling and Authorization Check (CRITICAL FIX)
    if (planError) {
        // If there's a database error (e.g., RLS denied access, ID not found), redirect safely.
        console.error(`Error fetching plan ${planId}:`, planError);
        return redirect('/dashboard/my-plans');
    }

    if (!plan) {
        // If plan was not found (single() returned null), redirect safely.
        return redirect('/dashboard/my-plans');
    }

    if (plan.assigned_to_id !== clientProfile.id) {
        // If the user is not the assigned client, deny access and redirect.
        console.warn(`Access denied for plan ${planId}. User is not assigned client.`);
        return redirect('/dashboard/my-plans');
    }

    if (entriesError) {
        console.error(`Error fetching entries for plan ${planId}:`, entriesError);
        // If entries fail to load, treat the whole detail view as unusable for safety.
        return redirect('/dashboard/my-plans');
    }

    // Explicitly cast for type safety when passing to Client Component
    const typedPlan = plan as unknown as PlanData;

    // Render the Client Component
    return <PlanDetailClient plan={typedPlan} initialEntries={entries || []} />;
}