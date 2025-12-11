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
    created_by_id: string;
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

    // 1. Get Client Profile ID (Used to check authorization)
    const { data: clientProfile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', session.user.id)
        .single();

    if (profileError || !clientProfile) {
        return redirect('/dashboard');
    }

    const currentProfileId = clientProfile.id;

    // 2. Fetch Plan Data and Entries
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
            created_by_id,
            creator:created_by_id(full_name)
        `)
        .eq('id', planId)
        .single();

    const entriesPromise = supabase
        .from('nutrition_plan_entries')
        .select('id, meal_type, food_name, quantity_grams, calories, protein, carbs, fats')
        .eq('plan_id', planId);

    const [{ data: plan, error: planError }, { data: entries, error: entriesError }] = await Promise.all([planPromise, entriesPromise]);

    // 3. Robust Failure Handling and Authorization Check (FIX)

    // Redirect if the database query failed (e.g., plan not found, invalid ID)
    if (planError || !plan) {
        console.error(`[PlanDetailPage] Crash prevention redirect. Error: ${planError?.message || 'Plan not found.'}`);
        return redirect('/dashboard/my-plans');
    }

    // FIX: Allow access if the user is the assigned client OR the plan creator.
    const isAuthorized = (plan.assigned_to_id === currentProfileId) || (plan.created_by_id === currentProfileId);

    if (!isAuthorized) {
        console.warn(`[PlanDetailPage] Access denied for plan ${planId}. User is neither assigned client nor creator.`);
        return redirect('/dashboard/my-plans');
    }

    if (entriesError) {
        console.error(`[PlanDetailPage] Error fetching entries for plan ${planId}:`, entriesError);
        // We render the plan details even if entries fail to load, passing an empty array.
    }

    // Ensure type compatibility before passing to Client Component
    const typedPlan = plan as unknown as PlanData;

    return <PlanDetailClient plan={typedPlan} initialEntries={entries || []} />;
}