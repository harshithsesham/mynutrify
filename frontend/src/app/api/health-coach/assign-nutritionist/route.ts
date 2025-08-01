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

        // First, let's get the consultation request to get the client's email
        const { data: consultationRequest } = await supabase
            .from('consultation_requests')
            .select('email, full_name')
            .eq('id', consultationId)
            .single();

        if (!consultationRequest) {
            return NextResponse.json({ error: 'Consultation request not found' }, { status: 404 });
        }

        // Try to find or create a profile for the client using their email
        let clientProfileId = clientId;

        // Check if clientId is actually a consultation request ID (UUID format)
        if (clientId.includes('-')) {
            console.log('Client ID appears to be a consultation ID, looking up profile by email');

            // First, check if a user exists with this email
            const { data: { users } } = await supabase.auth.admin.listUsers();
            const existingUser = users?.find(u => u.email === consultationRequest.email);

            if (existingUser) {
                // User exists, get their profile
                const { data: existingProfile } = await supabase
                    .from('profiles')
                    .select('id')
                    .eq('user_id', existingUser.id)
                    .single();

                if (existingProfile) {
                    clientProfileId = existingProfile.id;
                    console.log('Found existing profile for client:', clientProfileId);
                }
            } else {
                console.log('No user account exists for this email yet');
                // For now, we'll skip creating the assignment
                // In a real app, you might want to create a pending assignment
                return NextResponse.json({
                    error: 'Client does not have an account yet. They need to sign up first before being assigned a nutritionist.'
                }, { status: 400 });
            }
        }

        // Check if nutritionist profile exists
        const { data: nutritionistProfile } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', nutritionistId)
            .single();

        if (!nutritionistProfile) {
            return NextResponse.json({ error: 'Nutritionist not found' }, { status: 404 });
        }

        // Check if assignment already exists
        const { data: existingAssignment } = await supabase
            .from('nutritionist_assignments')
            .select('id')
            .eq('client_id', clientProfileId)
            .eq('nutritionist_id', nutritionistId)
            .single();

        if (existingAssignment) {
            console.log('Assignment already exists');
            // Update the consultation request anyway
            await supabase
                .from('consultation_requests')
                .update({
                    assigned_nutritionist_id: nutritionistId,
                    updated_at: new Date().toISOString()
                })
                .eq('id', consultationId);

            return NextResponse.json({
                success: true,
                assignment: existingAssignment,
                message: 'Assignment already exists, consultation updated'
            });
        }

        // Create nutritionist assignment
        const { data: assignment, error: assignmentError } = await supabase
            .from('nutritionist_assignments')
            .insert({
                client_id: clientProfileId,
                nutritionist_id: nutritionistId,
                assigned_by: healthCoach.id,
                assignment_reason: assignmentReason || 'Assigned by health coach after consultation',
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