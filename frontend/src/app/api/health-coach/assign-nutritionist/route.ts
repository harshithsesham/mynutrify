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

        // Get the consultation request to get the client's email
        const { data: consultationRequest } = await supabase
            .from('consultation_requests')
            .select('email, full_name')
            .eq('id', consultationId)
            .single();

        if (!consultationRequest) {
            return NextResponse.json({ error: 'Consultation request not found' }, { status: 404 });
        }

        // Find the client profile by email
        let clientProfileId = clientId;

        // Check if clientId is actually a consultation request ID (UUID format)
        if (clientId.includes('-')) {
            console.log('Client ID appears to be a consultation ID, looking up profile by email:', consultationRequest.email);

            // Use RPC function to find profile by email
            // This is the most reliable approach
            const { data: userProfiles, error: rpcError } = await supabase
                .rpc('find_profile_by_email', { user_email: consultationRequest.email });

            if (rpcError || !userProfiles || userProfiles.length === 0) {
                console.log('No user account found for email:', consultationRequest.email);
                console.log('RPC Error:', rpcError);

                return NextResponse.json({
                    error: `No user account found for email: ${consultationRequest.email}. The client needs to create an account first before being assigned a nutritionist.`
                }, { status: 400 });
            }

            clientProfileId = userProfiles[0].id;
            console.log('Found existing profile for client:', clientProfileId);
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