// app/api/health-coach/assign-nutritionist/route.ts
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    const supabase = createRouteHandlerClient({ cookies });
    const { clientId, nutritionistId, assignmentReason, consultationId } = await req.json();

    try {
        // Get current user (health coach)
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get health coach profile
        const { data: profile } = await supabase
            .from('profiles')
            .select('id')
            .eq('user_id', user.id)
            .single();

        if (!profile) {
            return NextResponse.json(
                { error: 'Profile not found' },
                { status: 404 }
            );
        }

        const { data: healthCoach } = await supabase
            .from('health_coaches')
            .select('id')
            .eq('profile_id', profile.id)
            .single();

        if (!healthCoach) {
            return NextResponse.json({ error: 'Not a health coach' }, { status: 403 });
        }

        // Create nutritionist assignment
        const { error: assignmentError } = await supabase
            .from('nutritionist_assignments')
            .insert({
                client_id: clientId,
                nutritionist_id: nutritionistId,
                assigned_by: healthCoach.id,
                assignment_reason: assignmentReason
            });

        if (assignmentError) throw assignmentError;

        // Update consultation request
        if (consultationId) {
            await supabase
                .from('consultation_requests')
                .update({
                    status: 'completed',
                    assigned_nutritionist_id: nutritionistId,
                    completed_at: new Date().toISOString()
                })
                .eq('id', consultationId);
        }

        // TODO: Send notification to nutritionist about new client
        // TODO: Send welcome email to client with nutritionist info

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error assigning nutritionist:', error);
        return NextResponse.json(
            { error: 'Failed to assign nutritionist' },
            { status: 500 }
        );
    }
}