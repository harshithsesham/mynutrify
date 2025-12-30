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

        // 1. Get Assignment Details
        const { data: assignment, error: fetchError } = await supabase
            .from('nutritionist_assignments')
            .select('*')
            .eq('id', assignmentId)
            .single();

        if (fetchError || !assignment) {
            return NextResponse.json({ error: 'Assignment not found', details: fetchError }, { status: 404 });
        }

        // 2. Perform the Unassign Update
        const { error: updateError } = await supabase
            .from('nutritionist_assignments')
            .update({
                status: 'inactive',
                unassigned_at: new Date().toISOString(),
                unassignment_reason: reason || 'Unassigned by health coach'
            })
            .eq('id', assignmentId);

        if (updateError) {
            console.error('Update Error:', updateError);
            return NextResponse.json({ error: 'Table update failed', details: updateError }, { status: 500 });
        }

        // 3. Cleanup Consultation Request
        // We use a try/catch block here so if these secondary tables fail,
        // the main unassignment still succeeds.
        try {
            await supabase
                .from('consultation_requests')
                .update({ assigned_nutritionist_id: null })
                .eq('client_id', assignment.client_id)
                .eq('assigned_nutritionist_id', assignment.nutritionist_id);

            await supabase
                .from('coach_clients')
                .delete()
                .eq('coach_id', assignment.nutritionist_id)
                .eq('client_id', assignment.client_id);
        } catch (cleanupError) {
            console.warn('Minor cleanup error:', cleanupError);
        }

        return NextResponse.json({ success: true });

    } catch (err: any) {
        return NextResponse.json({
            error: 'Server Exception',
            message: err.message
        }, { status: 500 });
    }
}