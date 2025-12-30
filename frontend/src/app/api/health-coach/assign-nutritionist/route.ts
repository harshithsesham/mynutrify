import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    // FIX 1: Await cookies and cast for Next.js 15+ compatibility
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({
        cookies: () => cookieStore as any
    });

    try {
        const { clientId, nutritionistId, assignmentReason, consultationId } = await req.json();

        // Validation
        if (!nutritionistId || !consultationId) {
            return NextResponse.json({ error: 'Missing required IDs' }, { status: 400 });
        }

        // 1. Ensure User is a Health Coach
        const { data: { user } } = await supabase.auth.getUser();
        const { data: profile } = await supabase
            .from('profiles')
            .select('id, role')
            .eq('user_id', user?.id)
            .single();

        if (profile?.role !== 'health_coach') {
            return NextResponse.json({ error: 'Forbidden: Health Coach only' }, { status: 403 });
        }

        // 2. Get the Health Coach ID for the assigned_by field
        const { data: healthCoach } = await supabase
            .from('health_coaches')
            .select('id')
            .eq('profile_id', profile.id)
            .single();

        if (!healthCoach) {
            return NextResponse.json({ error: 'Health coach record not found' }, { status: 403 });
        }

        // 3. Resolve the Client Profile ID from the consultation request
        const { data: consultation } = await supabase
            .from('consultation_requests')
            .select('client_id, email')
            .eq('id', consultationId)
            .single();

        const resolvedClientId = consultation?.client_id || clientId;
        if (!resolvedClientId) {
            return NextResponse.json({ error: 'Client profile not found. User must sign up first.' }, { status: 400 });
        }

        // 4. Create the assignment record
        const { error: assignmentError } = await supabase
            .from('nutritionist_assignments')
            .insert({
                client_id: resolvedClientId,
                nutritionist_id: nutritionistId,
                assigned_by: healthCoach.id,
                assignment_reason: assignmentReason || 'Assigned by health coach',
                status: 'active',
                assigned_at: new Date().toISOString()
            });

        if (assignmentError) throw assignmentError;

        // 5. Update the consultation request
        await supabase
            .from('consultation_requests')
            .update({ assigned_nutritionist_id: nutritionistId })
            .eq('id', consultationId);

        // 6. FIX 2: Create the coach_clients relationship for RLS permissions
        // This allows the nutritionist to actually see the client's data
        await supabase
            .from('coach_clients')
            .upsert({
                coach_id: nutritionistId,
                client_id: resolvedClientId
            });

        return NextResponse.json({ success: true, message: 'Nutritionist assigned successfully' });

    } catch (error: any) {
        console.error('Assignment Error:', error);
        return NextResponse.json({
            error: 'Failed to assign professional',
            details: error.message
        }, { status: 500 });
    }
}