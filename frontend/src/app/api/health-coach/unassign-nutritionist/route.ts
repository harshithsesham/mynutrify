import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    // 1. Await the cookies (Next.js 15+ requirement)
    const cookieStore = await cookies();

    // 2. Initialize Supabase
    const supabase = createRouteHandlerClient({
        cookies: () => cookieStore as any
    });

    try {
        const { assignmentId } = await req.json();

        if (!assignmentId) {
            return NextResponse.json({ error: 'Missing Assignment ID' }, { status: 400 });
        }

        // 3. Fetch assignment details first to get client/nutritionist IDs for cleanup
        const { data: assignment, error: fetchError } = await supabase
            .from('nutritionist_assignments')
            .select('*')
            .eq('id', assignmentId)
            .maybeSingle();

        if (fetchError) {
            return NextResponse.json({ error: 'Database query failed', details: fetchError.message }, { status: 500 });
        }

        if (!assignment) {
            return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
        }

        // 4. FIX: Delete the assignment row instead of updating it to 'inactive'
        const { error: deleteError } = await supabase
            .from('nutritionist_assignments')
            .delete()
            .eq('id', assignmentId);

        if (deleteError) {
            return NextResponse.json({ error: 'Deletion failed', details: deleteError }, { status: 500 });
        }

        // 5. Cleanup related tables
        // Reset consultation request status so the client can be assigned again
        await supabase
            .from('consultation_requests')
            .update({ assigned_nutritionist_id: null })
            .eq('client_id', assignment.client_id)
            .eq('assigned_nutritionist_id', assignment.nutritionist_id);

        // Delete the professional-client permission link to revoke data access
        await supabase
            .from('coach_clients')
            .delete()
            .eq('coach_id', assignment.nutritionist_id)
            .eq('client_id', assignment.client_id);

        return NextResponse.json({ success: true });

    } catch (err: any) {
        console.error('API Error:', err);
        return NextResponse.json({
            error: 'Server Exception',
            message: err.message
        }, { status: 500 });
    }
}