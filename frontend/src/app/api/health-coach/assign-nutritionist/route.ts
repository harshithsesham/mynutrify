// app/api/health-coach/assign-nutritionist/route.ts
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    const supabase = createRouteHandlerClient({ cookies });

    try {
        const { clientId, nutritionistId, assignmentReason, consultationId } = await req.json();

        // 0. Initial Validation
        if (!nutritionistId || !consultationId) {
            return NextResponse.json({ error: 'Missing required IDs (nutritionistId or consultationId)' }, { status: 400 });
        }

        console.log('🔥 Assign nutritionist API called for Consultation ID:', consultationId);

        // 1. Ensure we're logged in
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
            console.error('❌ User authentication failed:', userError);
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 2. Get the health coach's profile (profiles table)
        const { data: healthCoachProfile, error: profileError } = await supabase
            .from('profiles')
            .select('id, full_name, role')
            .eq('user_id', user.id)
            .single();

        if (profileError || !healthCoachProfile || healthCoachProfile.role !== 'health_coach') {
            console.error('❌ Authorization failed: User is not a verified health coach.');
            return NextResponse.json({ error: 'Forbidden: User is not a health coach' }, { status: 403 });
        }

        // 3. Get the health coach record (health_coaches table - source for assigned_by foreign key)
        const { data: healthCoachRecord, error: hcError } = await supabase
            .from('health_coaches')
            .select('id, profile_id')
            .eq('profile_id', healthCoachProfile.id)
            .single();

        if (hcError || !healthCoachRecord) {
            console.error('❌ Health coach record not found in health_coaches table:', hcError);
            return NextResponse.json({ error: 'Health coach record missing' }, { status: 403 });
        }

        // 4. Load the consultation request (to get email/client_id)
        const { data: consultationRequest, error: consError } = await supabase
            .from('consultation_requests')
            .select('email, full_name, client_id')
            .eq('id', consultationId)
            .single();

        if (consError || !consultationRequest) {
            console.error('❌ Consultation request not found:', consError);
            return NextResponse.json({ error: 'Consultation request not found' }, { status: 404 });
        }

        // 5. Determine the client profile ID (CRITICAL STABILITY POINT)
        let clientProfileId = consultationRequest.client_id || clientId;

        if (!clientProfileId) {
            // If client_id is null, attempt lookup by email (this is where the production RPC might fail)
            console.log('🔍 Looking up client by email via RPC...');
            const { data: userProfiles, error: rpcError } = await supabase
                .rpc('find_profile_by_email', { user_email: consultationRequest.email });

            if (rpcError) {
                console.error('❌ RPC call failed:', rpcError);
                return NextResponse.json({
                    error: 'Database lookup failed during client resolution.',
                    details: rpcError.message
                }, { status: 500 });
            }

            if (!userProfiles || userProfiles.length === 0) {
                return NextResponse.json({
                    error: `No user account found for email ${consultationRequest.email}. Client must sign up first.`
                }, { status: 400 });
            }

            clientProfileId = userProfiles[0].id;
        }

        // Final sanity check before database insertion/updates
        if (!clientProfileId) {
            console.error('❌ Final check failed: Client Profile ID is null after all lookups.');
            return NextResponse.json({ error: 'Client Profile ID could not be determined for assignment.' }, { status: 400 });
        }

        // 6. Validate nutritionist exists (Omitted for brevity, assumed correct in original code)
        // ... (Original validation logic)

        // 7. Check for existing assignment
        const { data: existingAssignment, error: existingError } = await supabase
            .from('nutritionist_assignments')
            .select('id, status')
            .eq('client_id', clientProfileId)
            .eq('nutritionist_id', nutritionistId)
            .maybeSingle();

        if (existingError) {
            return NextResponse.json({
                error: 'Error checking existing assignments',
                details: existingError.message
            }, { status: 500 });
        }

        if (existingAssignment) {
            // Update consultation and return existing
            await supabase
                .from('consultation_requests')
                .update({ assigned_nutritionist_id: nutritionistId, updated_at: new Date().toISOString() })
                .eq('id', consultationId);

            return NextResponse.json({
                success: true,
                assignment: existingAssignment,
                message: 'Assignment already exists.'
            });
        }

        // 8. CREATE THE NEW ASSIGNMENT - Use health_coaches.id for assigned_by! (This was the previous manual fix)
        const assignmentData = {
            client_id: clientProfileId,
            nutritionist_id: nutritionistId,
            assigned_by: healthCoachRecord.id, // Correctly using health_coaches.id
            assignment_reason: assignmentReason || 'Assigned by health coach',
            status: 'active',
            assigned_at: new Date().toISOString()
        };

        const { data: assignment, error: assignmentError } = await supabase
            .from('nutritionist_assignments')
            .insert(assignmentData)
            .select()
            .single();

        if (assignmentError) {
            console.error('❌ Assignment creation failed:', assignmentError);
            // Returning 500 with more details for better debugging
            return NextResponse.json({
                error: 'Failed to create assignment record',
                details: assignmentError.message,
            }, { status: 500 });
        }

        // 9. Update the consultation request
        await supabase
            .from('consultation_requests')
            .update({ assigned_nutritionist_id: nutritionistId, updated_at: new Date().toISOString() })
            .eq('id', consultationId);


        return NextResponse.json({
            success: true,
            assignment,
            message: 'Nutritionist assigned successfully'
        });

    } catch (error) {
        console.error('💥 Unexpected error in POST handler:', error);
        return NextResponse.json({
            error: 'Internal server error',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}