// app/dashboard/my-plans/[planId]/edit/page.tsx
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import EditPlanClient from './EditPlanClient';
import React from 'react';

type PageProps = {
    params: Promise<{ planId: string }>;
};

export default async function EditPlanPage({ params }: PageProps): Promise<React.ReactElement> {
    const resolvedParams = await params;
    const supabase = createServerComponentClient({ cookies });
    const planId = resolvedParams.planId;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        redirect('/login');
    }

    // Fetch the plan details and entries
    const planPromise = supabase
        .from('nutrition_plans')
        .select('id, title, target_calories, target_protein, target_carbs, target_fats, assigned_to_id')
        .eq('id', planId)
        .single();

    const entriesPromise = supabase
        .from('nutrition_plan_entries')
        .select('*')
        .eq('plan_id', planId)
        .order('meal_type', { ascending: true });

    const [{ data: plan, error: planError }, { data: entries, error: entriesError }] = await Promise.all([planPromise, entriesPromise]);

    if (planError || entriesError) {
        console.error("Error fetching plan for edit:", planError || entriesError);
        return <div className="text-red-500 p-8">Error loading plan for editing.</div>;
    }

    if (!plan) {
        return <div className="text-gray-500 p-8">Plan not found.</div>;
    }

    return <EditPlanClient plan={plan} initialEntries={entries || []} />;
}