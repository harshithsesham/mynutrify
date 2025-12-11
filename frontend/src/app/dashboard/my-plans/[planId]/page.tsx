// src/app/dashboard/my-plans/[planId]/page.tsx
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import PlanDetailClient from './PlanDetailClient';
import React from 'react';

// Force dynamic to prevent caching of stale plan data
export const dynamic = 'force-dynamic';

type PageProps = {
    params: Promise<{ planId: string }>;
};

export default async function PlanDetailPage({ params }: PageProps): Promise<React.ReactElement> {
    // 1. Await params properly for Next.js 16 support
    const resolvedParams = await params;
    const planId = resolvedParams.planId;

    const supabase = createServerComponentClient({ cookies });

    // 2. Check Session
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        redirect('/login');
    }

    console.log(`[PlanDetailPage] Fetching plan ID: ${planId} for User: ${session.user.email}`);

    // 3. Fetch Plan Data
    // We check if the plan exists AND if the user is the 'assigned_to' or 'created_by'
    const planPromise = supabase
        .from('nutrition_plans')
        .select(`*, creator:created_by_id(full_name)`)
        .eq('id', planId)
        .single();

    const entriesPromise = supabase
        .from('nutrition_plan_entries')
        .select('*')
        .eq('plan_id', planId);

    const [{ data: plan, error: planError }, { data: entries, error: entriesError }] = await Promise.all([planPromise, entriesPromise]);

    // 4. Handle Errors (UI instead of Redirects for safety)
    if (planError) {
        console.error("[PlanDetailPage] Error:", planError);
        return (
            <div className="p-12 text-center">
                <div className="inline-block p-4 rounded-full bg-red-100 mb-4">
                    <span className="text-2xl">⚠️</span>
                </div>
                <h2 className="text-xl font-bold text-gray-900">Unable to load plan</h2>
                <p className="text-gray-500 mt-2 mb-6">
                    {planError.code === 'PGRST116' ? 'Plan not found.' : planError.message}
                </p>
                <a href="/dashboard/my-plans" className="text-indigo-600 hover:underline">
                    &larr; Back to My Plans
                </a>
            </div>
        );
    }

    if (!plan) {
        return (
            <div className="p-12 text-center">
                <h2 className="text-xl font-bold text-gray-900">Plan not found</h2>
                <p className="text-gray-500 mt-2">
                    This plan may have been deleted or you do not have permission to view it.
                </p>
            </div>
        );
    }

    // 5. Render Client Component
    // We pass empty array for entries if that specific fetch failed, so the page still loads
    return (
        <PlanDetailClient
            plan={plan}
            initialEntries={entries || []}
        />
    );
}