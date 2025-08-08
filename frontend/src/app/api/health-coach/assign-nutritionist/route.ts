// app/api/health-coach/assign-nutritionist/route.ts
// DEBUG VERSION - Replace your current file with this temporarily

import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    const supabase = createRouteHandlerClient({ cookies });

    try {
        const requestBody = await req.json();
        console.log('🔥 API called with request body:', JSON.stringify(requestBody, null, 2));

        const { clientId, nutritionistId, assignmentReason, consultationId } = requestBody;

        // 1. Get authenticated user
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError || !user) {
            console.error('❌ Authentication failed:', userError);
            return NextResponse.json({
                error: 'Authentication failed',
                details: userError?.message
            }, { status: 401 });
        }

        console.log('✅ User authenticated:', user.id);

        // 2. Get health coach profile
        const { data: healthCoachProfile, error: profileError } = await supabase
            .from('profiles')
            .select('id, full_name, role')
            .eq('user_id', user.id)
            .single();

        if (profileError) {
            console.error('❌ Profile query error:', profileError);
            return NextResponse.json({
                error: 'Profile not found',
                details: profileError.message,
                supabaseError: profileError
            }, { status: 404 });
        }

        console.log('✅ Health coach profile:', healthCoachProfile);

        // 3. Verify health coach record exists
        const { data: healthCoachRecord, error: hcError } = await supabase
            .from('health_coaches')
            .select('id, profile_id')
            .eq('profile_id', healthCoachProfile.id)
            .single();

        if (hcError) {
            console.error('❌ Health coach verification error:', hcError);
            return NextResponse.json({
                error: 'Health coach verification failed',
                details: hcError.message,
                supabaseError: hcError
            }, { status: 403 });
        }

        console.log('✅ Health coach record:', healthCoachRecord);

        // 4. Get consultation request
        const { data: consultationRequest, error: consError } = await supabase
            .from('consultation_requests')
            .select('id, email, full_name, client_id')
            .eq('id', consultationId)
            .single();

        if (consError) {
            console.error('❌ Consultation request error:', consError);
            return NextResponse.json({
                error: 'Consultation request not found',
                details: consError.message,
                supabaseError: consError
            }, { status: 404 });
        }

        console.log('✅ Consultation request:', consultationRequest);

        // 5. Determine client profile ID
        let clientProfileId = consultationRequest.client_id || clientId;

        if (!clientProfileId) {
            console.log('🔍 Looking up client by email:', consultationRequest.email);

            // Try to find client profile by email
            const { data: clientProfiles, error: clientError } = await supabase
                .from('profiles')
                .select('id, user_id, full_name')
                .eq('email', consultationRequest.email)
                .limit(1);

            if (clientError) {
                console.error('❌ Client lookup error:', clientError);
                return NextResponse.json({
                    error: 'Client lookup failed',
                    details: clientError.message
                }, { status: 400 });
            }

            if (!clientProfiles || clientProfiles.length === 0) {
                // Try using RPC function as fallback
                const { data: rpcProfiles, error: rpcError } = await supabase
                    .rpc('find_profile_by_email', { user_email: consultationRequest.email });

                if (rpcError || !rpcProfiles?.length) {
                    console.error('❌ No client profile found:', { rpcError, email: consultationRequest.email });
                    return NextResponse.json({
                        error: `No user account found for email ${consultationRequest.email}. Client must sign up first.`
                    }, { status: 400 });
                }

                clientProfileId = rpcProfiles[0].id;
                console.log('✅ Found client via RPC:', clientProfileId);
            } else {
                clientProfileId = clientProfiles[0].id;
                console.log('✅ Found client via direct query:', clientProfileId);
            }
        }

        // 6. Validate nutritionist
        const { data: nutritionistProfile, error: nutError } = await supabase
            .from('profiles')
            .select('id, full_name, role')
            .eq('id', nutritionistId)
            .single();

        if (nutError) {
            console.error('❌ Nutritionist validation error:', nutError);
            return NextResponse.json({
                error: 'Nutritionist not found',
                details: nutError.message
            }, { status: 404 });
        }

        console.log('✅ Nutritionist validated:', nutritionistProfile);

        // 7. Check for existing assignments
        const { data: existingAssignment, error: existingError } = await supabase
            .from('nutritionist_assignments')
            .select('id, status, client_id, nutritionist_id, assigned_by')
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

            // Update consultation anyway
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
                message: 'Assignment already exists and consultation updated.'
            });
        }

        // 8. Prepare assignment data
        const assignmentData = {
            client_id: clientProfileId,
            nutritionist_id: nutritionistId,
            assigned_by: healthCoachProfile.id, // Using profile ID
            assignment_reason: assignmentReason || 'Assigned by health coach',
            status: 'active',
            assigned_at: new Date().toISOString()
        };

        console.log('💾 About to insert assignment with data:', JSON.stringify(assignmentData, null, 2));

        // 9. CRITICAL: Let's check the table structure first
        const { data: tableInfo, error: tableError } = await supabase
            .from('nutritionist_assignments')
            .select('*')
            .limit(1);

        console.log('📋 Table structure check:', { tableInfo, tableError });

        // 10. Try the insert
        const { data: assignment, error: assignmentError } = await supabase
            .from('nutritionist_assignments')
            .insert(assignmentData)
            .select('*')
            .single();

        if (assignmentError) {
            console.error('❌ ASSIGNMENT INSERT FAILED:', {
                error: assignmentError,
                code: assignmentError.code,
                message: assignmentError.message,
                details: assignmentError.details,
                hint: assignmentError.hint,
                insertData: assignmentData
            });

            // Let's try to get more info about the table constraints
            const { data: constraints, error: constraintError } = await supabase
                .rpc('get_table_constraints', { table_name: 'nutritionist_assignments' })
                .single();

            console.log('🔍 Table constraints:', { constraints, constraintError });

            return NextResponse.json({
                error: 'Failed to create assignment',
                details: assignmentError.message,
                code: assignmentError.code,
                hint: assignmentError.hint,
                insertData: assignmentData,
                debugInfo: {
                    healthCoachId: healthCoachProfile.id,
                    clientId: clientProfileId,
                    nutritionistId: nutritionistId,
                    tableConstraints: constraints
                }
            }, { status: 500 });
        }

        console.log('✅ Assignment created successfully:', assignment);

        // 11. Update consultation request
        const { error: consUpdateError } = await supabase
            .from('consultation_requests')
            .update({
                assigned_nutritionist_id: nutritionistId,
                updated_at: new Date().toISOString()
            })
            .eq('id', consultationId);

        if (consUpdateError) {
            console.warn('⚠️ Consultation update failed:', consUpdateError);
        }

        return NextResponse.json({
            success: true,
            assignment,
            message: 'Nutritionist assigned successfully',
            debugInfo: {
                healthCoachId: healthCoachProfile.id,
                clientId: clientProfileId,
                nutritionistId: nutritionistId
            }
        });

    } catch (error) {
        console.error('💥 Unexpected error:', error);

        return NextResponse.json({
            error: 'Internal server error',
            details: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined
        }, { status: 500 });
    }
}