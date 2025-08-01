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

        console.log('Assignment data:', { clientId, nutritionistId, assignmentReason, consultationId });

        // FIXED: Check if client profile exists first
        const { data: clientProfile } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', clientId)
            .single();

        if (!clientProfile) {
            return NextResponse.json({ error: 'Client not found' }, { status: 404 });
        }

        // FIXED: Check if nutritionist profile exists
        const { data: nutritionistProfile } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', nutritionistId)
            .single();

        if (!nutritionistProfile) {
            return NextResponse.json({ error: 'Nutritionist not found' }, { status: 404 });
        }

        // Create nutritionist assignment
        const { data: assignment, error: assignmentError } = await supabase
            .from('nutritionist_assignments')
            .insert({
                client_id: clientId,
                nutritionist_id: nutritionistId,
                assigned_by: healthCoach.id,
                assignment_reason: assignmentReason || 'Assigned by health coach',
                status: 'active',
                created_at: new Date().toISOString()
            })
            .select()
            .single();

        if (assignmentError) {
            console.error('Assignment error:', assignmentError);
            throw assignmentError;
        }

        console.log('Assignment created:', assignment);

        // Update consultation request
        if (consultationId) {
            const { error: consultationError } = await supabase
                .from('consultation_requests')
                .update({
                    assigned_nutritionist_id: nutritionistId,
                    updated_at: new Date().toISOString()
                })
                .eq('id', consultationId);

            if (consultationError) {
                console.error('Consultation update error:', consultationError);
                // Don't fail the whole operation if this fails
            }
        }

        // TODO: Send notification to nutritionist about new client
        // TODO: Send welcome email to client with nutritionist info

        return NextResponse.json({
            success: true,
            assignment,
            message: 'Nutritionist assigned successfully'
        });
    } catch (error) {
        console.error('Error assigning nutritionist:', error);
        return NextResponse.json(
            {
                error: 'Failed to assign nutritionist',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}