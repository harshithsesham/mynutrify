import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    const supabase = createRouteHandlerClient({ cookies });

    try {
        const { assignmentId, reason } = await req.json();

        // 1. Check Auth
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Auth failed', details: authError }, { status: 401 });
        }

        // 2. Fetch assignment BEFORE update
        const { data: assignment, error: fetchErr } = await supabase
            .from('nutritionist_assignments')
            .select('*')
            .eq('id', assignmentId)
            .single();

        if (fetchErr || !assignment) {
            return NextResponse.json({ error: 'Assignment not found', details: fetchErr }, { status: 404 });
        }

        // 3. Perform the update
        const { error: updateErr } = await supabase
            .from('nutritionist_assignments')
            .update({
                status: 'inactive',
                unassigned_at: new Date().toISOString(),
                unassignment_reason: reason || 'Unassigned by coach'
            })
            .eq('id', assignmentId);

        if (updateErr) {
            return NextResponse.json({ error: 'Database Update Failed', details: updateErr }, { status: 500 });
        }

        // 4. Cleanup related tables (Consultations)
        await supabase
            .from('consultation_requests')
            .update({ assigned_nutritionist_id: null })
            .eq('client_id', assignment.client_id)
            .eq('assigned_nutritionist_id', assignment.nutritionist_id);

        // 5. Cleanup related tables (Relationships)
        await supabase
            .from('coach_clients')
            .delete()
            .eq('coach_id', assignment.nutritionist_id)
            .eq('client_id', assignment.client_id);

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error('API Error:', error);
        return NextResponse.json({
            error: 'Server crash',
            message: error.message
        }, { status: 500 });
    }
}