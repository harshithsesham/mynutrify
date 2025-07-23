// app/dashboard/my-plans/[planId]/page.tsx
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import PlanDetailClient from './PlanDetailClient';
import React from 'react';

// Define the props type to match what the build process expects
type PageProps = {
    params: Promise<{ planId: string }>;
};

// Make the component async and await the params to resolve the Promise.
export default async function PlanDetailPage({ params }: PageProps): Promise<React.ReactElement> {
    const resolvedParams = await params;
    const supabase = createServerComponentClient({ cookies });
    const planId = resolvedParams.planId;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        redirect('/login');
    }

    // Fetch the plan details, its entries, and the assigned client's ID in parallel
    const planPromise = supabase
        .from('nutrition_plans')
        .select(`*, creator:created_by_id(full_name), assigned_to_id`) // Added assigned_to_id
        .eq('id', planId)
        .single();

    const entriesPromise = supabase
        .from('nutrition_plan_entries')
        .select('*')
        .eq('plan_id', planId);

    const [{ data: plan, error: planError }, { data: entries, error: entriesError }] = await Promise.all([planPromise, entriesPromise]);

    if (planError || entriesError) {
        console.error("Error fetching plan details:", planError || entriesError);
        return <div className="text-red-500 p-8">Error loading plan details.</div>;
    }

    if (!plan) {
        return <div className="text-gray-500 p-8">Plan not found.</div>;
    }

    // Render the Client Component and pass the fetched data as props
    return <PlanDetailClient plan={plan} initialEntries={entries || []} />;
}
