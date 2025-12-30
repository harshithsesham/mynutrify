import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    const supabase = createRouteHandlerClient({ cookies });

    try {
        const body = await req.json();
        const { assignmentId, reason } = body;

        if (!assignmentId) {
            return NextResponse.json({ error: 'Missing Assignment ID' }, { status: 400 });
        }

        // 1. Verify User Role
        const { data: { user } } = await supabase.auth.getUser();
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('user_id', user?.id)
            .single();

        if (profile?.role !== 'health_coach') {
            return NextResponse.json({ error: 'Unauthorized: Health Coach only' }, { status: 403 });
        }

        // 2. Fetch Assignment Data
        const { data: assignment, error: fetchErr } = await supabase
            .from('nutritionist_assignments')
            .select('*')
            .eq('id', assignmentId)
            .single();

        if (fetchErr || !assignment) {
            console.error('Fetch Error:', fetchErr);
            return NextResponse.json({ error: 'Assignment record not found' }, { status: 404 });
        }

        // 3. Update Assignment Status
        // Use ISO string for the timestamp
        const { error: updateErr } = await supabase
            .from('nutritionist_assignments')
            .update({
                status: 'inactive',
                unassigned_at: new Date().toISOString(),
                unassignment_reason: reason || 'Unassigned by health coach'
            })
            .eq('id', assignmentId);

        if (updateErr) {
            console.error('Update assignments table failed:', updateErr);
            throw updateErr;
        }

        // 4. Update Consultation Request
        const { error: consultErr } = await supabase
            .from('consultation_requests')
            .update({ assigned_nutritionist_id: null })
            .eq('client_id', assignment.client_id)
            .eq('assigned_nutritionist_id', assignment.nutritionist_id);

        if (consultErr) console.warn('Note: Could not update consultation_requests:', consultErr.message);

        // 5. Remove Coach-Client relationship
        const { error: deleteErr } = await supabase
            .from('coach_clients')
            .delete()
            .eq('coach_id', assignment.nutritionist_id)
            .eq('client_id', assignment.client_id);

        if (deleteErr) console.warn('Note: Could not delete coach_clients link:', deleteErr.message);

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error('CRITICAL UNASSIGN ERROR:', error);
        return NextResponse.json({
            error: 'Internal server error',
            details: error.message || 'Unknown error'
        }, { status: 500 });
    }
}