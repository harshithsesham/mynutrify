import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    const supabase = createRouteHandlerClient({ cookies });

    try {
        const { assignmentId, reason } = await req.json();

        if (!assignmentId) {
            return NextResponse.json({ error: 'Missing Assignment ID' }, { status: 400 });
        }

        // 1. Verify User is a Health Coach
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('user_id', user.id)
            .single();

        if (profile?.role !== 'health_coach') {
            return NextResponse.json({ error: 'Forbidden: User is not a health coach' }, { status: 403 });
        }

        // 2. Fetch assignment details before updating to know who to unassign
        const { data: assignment, error: fetchError } = await supabase
            .from('nutritionist_assignments')
            .select('client_id, nutritionist_id')
            .eq('id', assignmentId)
            .single();

        if (fetchError || !assignment) {
            return NextResponse.json({ error: 'Assignment record not found' }, { status: 404 });
        }

        // 3. Update the assignment status to inactive
        const { error: updateError } = await supabase
            .from('nutritionist_assignments')
            .update({
                status: 'inactive',
                unassigned_at: new Date().toISOString(),
                unassignment_reason: reason || 'Unassigned by health coach'
            })
            .eq('id', assignmentId);

        if (updateError) throw updateError;

        // 4. Clear the nutritionist link in consultation_requests
        // This allows the client to be assigned to someone else later
        await supabase
            .from('consultation_requests')
            .update({ assigned_nutritionist_id: null })
            .eq('client_id', assignment.client_id)
            .eq('assigned_nutritionist_id', assignment.nutritionist_id);

        // 5. Remove the coach-client relationship link
        await supabase
            .from('coach_clients')
            .delete()
            .eq('coach_id', assignment.nutritionist_id)
            .eq('client_id', assignment.client_id);

        return NextResponse.json({
            success: true,
            message: 'Professional unassigned and relationship cleaned up successfully'
        });

    } catch (error) {
        console.error('💥 Unassign API Error:', error);
        return NextResponse.json({
            error: 'Internal server error',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}