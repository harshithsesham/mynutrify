// app/api/health-coach/assign-nutritionist/route.ts

import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    const supabase = createRouteHandlerClient({ cookies });
    const { clientId, nutritionistId, assignmentReason, consultationId } = await req.json();

    console.log('🔥 Assign nutritionist API called with:', {
        clientId,
        nutritionistId,
        assignmentReason,
        consultationId
    });

    try {
        // 1. Ensure we're logged in
        const {
            data: { user },
            error: userError
        } = await supabase.auth.getUser();

        if (userError || !user) {
            console.error('❌ User authentication failed:', userError);
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        console.log('✅ User authenticated:', user.id);

        // 2. Get the health coach's profile ID (not user ID!)
        const { data: healthCoachProfile, error: profileError } = await supabase
            .from('profiles')
            .select('id')
            .eq('user_id', user.id)
            .single();

        if (profileError || !healthCoachProfile) {
            console.error('❌ Health coach profile not found:', profileError);
            return NextResponse.json({ error: 'Health coach profile not found' }, { status: 404 });
        }

        console.log('✅ Health coach profile found:', healthCoachProfile.id);

        // 3. Verify this profile is actually a health coach
        const { data: healthCoachRecord, error: hcError } = await supabase
            .from('health_coaches')
            .select('id')
            .eq('profile_id', healthCoachProfile.id)
            .single();

        if (hcError || !healthCoachRecord) {
            console.error('❌ Not a health coach:', hcError);
            return NextResponse.json({ error: 'Not a health coach' }, { status: 403 });
        }

        console.log('✅ Health coach record verified:', healthCoachRecord.id);

        // 4. Load the consultation request to validate
        const { data: consultationRequest, error: consError } = await supabase
            .from('consultation_requests')
            .select('email, full_name, client_id')
            .eq('id', consultationId)
            .single();

        if (consError || !consultationRequest) {
            console.error('❌ Consultation request not found:', consError);
            return NextResponse.json({ error: 'Consultation request not found' }, { status: 404 });
        }

        console.log('✅ Consultation request found:', consultationRequest);

        // 5. Determine the real client_profile_id
        let clientProfileId = consultationRequest.client_id;

        if (!clientProfileId) {
            console.log('🔍 No client_id in consultation, looking up by email...');
            // Find client by email if not directly linked
            const { data: userProfiles, error: rpcError } = await supabase
                .rpc('find_profile_by_email', { user_email: consultationRequest.email });

            if (rpcError || !userProfiles?.length) {
                console.error('❌ No user account found for email:', consultationRequest.email, rpcError);
                return NextResponse.json({
                    error: `No user account found for email ${consultationRequest.email}. Client must sign up first.`
                }, { status: 400 });
            }

            clientProfileId = userProfiles[0].id;
            console.log('✅ Found client profile by email:', clientProfileId);
        }

        // 6. Validate nutritionist exists
        const { data: nutritionistProfile, error: nutError } = await supabase
            .from('profiles')
            .select('id, full_name')
            .eq('id', nutritionistId)
            .single();

        if (nutError || !nutritionistProfile) {
            console.error('❌ Nutritionist not found:', nutError);
            return NextResponse.json({ error: 'Nutritionist not found' }, { status: 404 });
        }

        console.log('✅ Nutritionist validated:', nutritionistProfile);

        // 7. Check for existing assignment to prevent duplicates
        const { data: existingAssignment, error: existingError } = await supabase
            .from('nutritionist_assignments')
            .select('id, status')
            .eq('client_id', clientProfileId)
            .eq('nutritionist_id', nutritionistId)
            .maybeSingle();

        if (existingError) {
            console.error('❌ Error checking existing assignments:', existingError);
            return NextResponse.json({
                error: 'Error checking existing assignments',
                details: existingError.message
            }, { status: 500 });
        }

        if (existingAssignment) {
            console.log('⚠️ Assignment already exists:', existingAssignment);

            // Update the consultation row anyway
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
                message: 'Assignment already exists.'
            });
        }

        // 8. CREATE THE NEW ASSIGNMENT - Use profile ID, not user ID!
        const timestamp = new Date().toISOString();
        const assignmentData = {
            client_id: clientProfileId,
            nutritionist_id: nutritionistId,
            assigned_by: healthCoachProfile.id, // ✅ Use profile ID, not user ID!
            assignment_reason: assignmentReason || 'Assigned by health coach',
            status: 'active',
            assigned_at: timestamp
        };

        console.log('💾 Creating assignment with data:', assignmentData);

        const { data: assignment, error: assignmentError } = await supabase
            .from('nutritionist_assignments')
            .insert(assignmentData)
            .select()
            .single();

        if (assignmentError) {
            console.error('❌ Assignment creation failed:', assignmentError);
            console.error('Assignment error details:', {
                code: assignmentError.code,
                message: assignmentError.message,
                details: assignmentError.details,
                hint: assignmentError.hint
            });

            return NextResponse.json(
                {
                    error: 'Failed to assign nutritionist',
                    details: assignmentError.message,
                    debug: assignmentError
                },
                { status: 500 }
            );
        }

        console.log('✅ Assignment created successfully:', assignment);

        // 9. Update the consultation_requests row
        const { error: consUpdError } = await supabase
            .from('consultation_requests')
            .update({
                assigned_nutritionist_id: nutritionistId,
                updated_at: timestamp
            })
            .eq('id', consultationId);

        if (consUpdError) {
            console.warn('⚠️ Consultation update failed (non-critical):', consUpdError);
        } else {
            console.log('✅ Consultation request updated');
        }

        return NextResponse.json({
            success: true,
            assignment,
            message: 'Nutritionist assigned successfully'
        });

    } catch (error) {
        console.error('💥 Unexpected error in assign nutritionist API:', error);
        return NextResponse.json(
            {
                error: 'Internal server error',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}