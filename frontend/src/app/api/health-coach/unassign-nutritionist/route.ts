import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    // 1. Await the cookies (Next.js 15+ requirement)
    const cookieStore = await cookies();

    // 2. Initialize Supabase
    // We cast the return to 'any' to satisfy the outdated TypeScript definitions
    // in the auth-helpers-nextjs package for Next.js 15/16.
    const supabase = createRouteHandlerClient({
        cookies: () => cookieStore as any
    });

    try {
        const { assignmentId, reason } = await req.json();

        if (!assignmentId) {
            return NextResponse.json({ error: 'Missing Assignment ID' }, { status: 400 });
        }

        // 3. Fetch assignment details (using maybeSingle to handle errors gracefully)
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

        // 4. Update the assignment to inactive
        const { error: updateError } = await supabase
            .from('nutritionist_assignments')
            .update({
                status: 'inactive',
                unassigned_at: new Date().toISOString(),
                unassignment_reason: reason || 'Unassigned by health coach'
            })
            .eq('id', assignmentId);

        if (updateError) {
            return NextResponse.json({ error: 'Update failed', details: updateError }, { status: 500 });
        }

        // 5. Cleanup related tables
        // Reset consultation request status
        await supabase
            .from('consultation_requests')
            .update({ assigned_nutritionist_id: null })
            .eq('client_id', assignment.client_id)
            .eq('assigned_nutritionist_id', assignment.nutritionist_id);

        // Delete the professional-client permission link
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