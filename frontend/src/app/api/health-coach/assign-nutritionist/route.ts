// app/api/health-coach/assign-nutritionist/route.ts

import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    const supabase = createRouteHandlerClient({ cookies });
    const { clientId, nutritionistId, assignmentReason, consultationId } = await req.json();

    // 1. Ensure we’re logged in
    const {
        data: { user },
        error: userError
    } = await supabase.auth.getUser();
    if (userError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Confirm this user is a health coach
    const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();
    if (!profile) {
        return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const { data: hc } = await supabase
        .from('health_coaches')
        .select('id')
        .eq('profile_id', profile.id)
        .single();
    if (!hc) {
        return NextResponse.json({ error: 'Not a health coach' }, { status: 403 });
    }

    // 3. Load the consultation request
    const { data: consultationRequest, error: consError } = await supabase
        .from('consultation_requests')
        .select('email, full_name, client_id')
        .eq('id', consultationId)
        .single();
    if (consError || !consultationRequest) {
        return NextResponse.json({ error: 'Consultation request not found' }, { status: 404 });
    }

    // 4. Determine the real client_profile_id
    let clientProfileId = consultationRequest.client_id;
    if (!clientProfileId) {
        // only look up by email if we truly have no client_id
        const { data: userProfiles, error: rpcError } = await supabase
            .rpc('find_profile_by_email', { user_email: consultationRequest.email });
        if (rpcError || !userProfiles?.length) {
            return NextResponse.json({
                error: `No user account found for email ${consultationRequest.email}. Client must sign up first.`
            }, { status: 400 });
        }
        clientProfileId = userProfiles[0].id;
    }

    // 5. Make sure the nutritionist exists
    const { data: nutProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', nutritionistId)
        .single();
    if (!nutProfile) {
        return NextResponse.json({ error: 'Nutritionist not found' }, { status: 404 });
    }

    // 6. Prevent duplicates
    const { data: existing } = await supabase
        .from('nutritionist_assignments')
        .select('id')
        .eq('client_id', clientProfileId)
        .eq('nutritionist_id', nutritionistId)
        .single();
    if (existing) {
        // but still update the consultation row
        await supabase
            .from('consultation_requests')
            .update({ assigned_nutritionist_id: nutritionistId, updated_at: new Date().toISOString() })
            .eq('id', consultationId);

        return NextResponse.json({
            success: true,
            assignment: existing,
            message: 'Assignment already exists.'
        });
    }

    // 6) **The fix**: insert assigned_at instead of created_at
    const timestamp = new Date().toISOString();
    const { data: assignment, error: assignmentError } = await supabase
        .from('nutritionist_assignments')
        .insert({
            client_id:           clientProfileId,
            nutritionist_id:     nutritionistId,
            assigned_by:         user.id,
            assignment_reason:   assignmentReason || 'Assigned by health coach',
            status:              'active',
            assigned_at:         timestamp
        })
        .select()
        .single();

    if (assignmentError) {
        console.error('Assignment error details:', assignmentError);
        return NextResponse.json(
            { error: 'Failed to assign nutritionist', details: assignmentError.message },
            { status: 500 }
        );
    }

    // 8. Update the consultation_requests row
    const { error: consUpdError } = await supabase
        .from('consultation_requests')
        .update({ assigned_nutritionist_id: nutritionistId, updated_at: new Date().toISOString() })
        .eq('id', consultationId);

    if (consUpdError) {
        console.warn('Consultation update failed:', consUpdError);
    }

    return NextResponse.json({
        success: true,
        assignment,
        message: 'Nutritionist assigned successfully'
    });
}
