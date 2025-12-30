// frontend/src/app/dashboard/my-plans/[planId]/edit/page.tsx
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import EditPlanClient from './EditPlanClient';
import React from 'react';

export const dynamic = 'force-dynamic';

type PageProps = {
    // FIX: Define params as a Promise for Next.js 15 compatibility
    params: Promise<{ planId: string }>;
};

export default async function EditPlanPage({ params }: PageProps) {
    // FIX: Await params before accessing planId
    const resolvedParams = await params;
    const planId = resolvedParams.planId;

    if (!planId || planId === 'undefined') {
        return redirect('/dashboard/my-plans');
    }

    // FIX: Await cookies() before creating the Supabase client
    const cookieStore = await cookies();
    const supabase = createServerComponentClient({ cookies: () => cookieStore as any });

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        redirect('/login');
    }

    // 1. Get user profile
    const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', session.user.id)
        .single();

    if (!profile) redirect('/dashboard');

    // 2. Fetch existing plan data
    const { data: plan, error: planError } = await supabase
        .from('nutrition_plans')
        .select(`
            id, 
            title, 
            notes, 
            assigned_to_id, 
            created_by_id,
            target_calories,
            target_protein,
            target_carbs,
            target_fats
        `)
        .eq('id', planId)
        .single();

    if (planError || !plan) {
        return redirect('/dashboard/my-plans');
    }

    // 3. Authorization Check: Only the creator can edit
    if (plan.created_by_id !== profile.id) {
        return redirect(`/dashboard/my-plans/${planId}`);
    }

    // 4. Fetch existing entries
    const { data: entries } = await supabase
        .from('nutrition_plan_entries')
        .select('*')
        .eq('plan_id', planId);

    return <EditPlanClient plan={plan} initialEntries={entries || []} />;
}