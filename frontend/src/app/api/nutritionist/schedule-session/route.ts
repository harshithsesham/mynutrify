// app/api/nutritionist/schedule-session/route.ts
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';


// UPDATED: app/api/nutritionist/schedule-session/route.ts
// This version properly handles timezone conversion

export async function POST(req: NextRequest) {
    const supabase = createRouteHandlerClient({ cookies });

    try {
        console.log('🔥 Schedule session API called');

        const requestBody = await req.json();
        console.log('📝 Request body:', JSON.stringify(requestBody, null, 2));

        const { clientId, startTime, duration, sessionType, sessionNotes } = requestBody;

        // Validate input
        if (!clientId || !startTime || !duration) {
            console.error('❌ Missing required fields');
            return NextResponse.json({
                error: 'Missing required fields: clientId, startTime, or duration'
            }, { status: 400 });
        }

        // Get authenticated user (nutritionist)
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            console.error('❌ Authentication failed:', authError);
            return NextResponse.json({
                error: 'Authentication required'
            }, { status: 401 });
        }

        console.log('✅ User authenticated:', user.id);

        // Get nutritionist profile
        const { data: nutritionistProfile, error: profileError } = await supabase
            .from('profiles')
            .select('id, full_name, role, hourly_rate, google_refresh_token, timezone')
            .eq('user_id', user.id)
            .single();

        if (profileError || !nutritionistProfile) {
            console.error('❌ Nutritionist profile not found:', profileError);
            return NextResponse.json({
                error: 'Nutritionist profile not found'
            }, { status: 404 });
        }

        const nutritionistTimezone = nutritionistProfile.timezone || 'UTC';
        console.log('✅ Nutritionist profile found:', nutritionistProfile.full_name);
        console.log('🌍 Nutritionist timezone:', nutritionistTimezone);

        // Validate client exists
        const { data: clientProfile, error: clientError } = await supabase
            .from('profiles')
            .select('id, full_name, email, user_id')
            .eq('id', clientId)
            .single();

        if (clientError || !clientProfile) {
            console.error('❌ Client profile not found:', clientError);
            return NextResponse.json({
                error: 'Client profile not found'
            }, { status: 404 });
        }

        console.log('✅ Client profile found:', clientProfile.full_name);

        // Parse the appointment time
        let localStartTime: string;
        let localEndTime: string;

        if (startTime.includes('T') && !startTime.includes('Z') && !startTime.includes('+') && !startTime.includes('-')) {
            // This is a local datetime without timezone info (e.g., "2024-12-20T11:00")
            console.log('📅 Received local time:', startTime);

            // Parse the components
            const [datePart, timePart] = startTime.split('T');
            const [hourStr, minuteStr] = timePart.split(':');
            const hour = parseInt(hourStr);
            const minute = parseInt(minuteStr);

            // Create local time strings
            localStartTime = `${datePart} ${hourStr.padStart(2, '0')}:${minuteStr.padStart(2, '0')}:00`;

            // Calculate end time
            const endHour = hour + Math.floor(duration / 60);
            const endMinute = minute + (duration % 60);
            const adjustedEndHour = endHour + Math.floor(endMinute / 60);
            const adjustedEndMinute = endMinute % 60;

            localEndTime = `${datePart} ${adjustedEndHour.toString().padStart(2, '0')}:${adjustedEndMinute.toString().padStart(2, '0')}:00`;

            console.log('🕐 Local start time:', localStartTime);
            console.log('🕐 Local end time:', localEndTime);

        } else {
            return NextResponse.json({
                error: 'Invalid time format. Expected local time without timezone.'
            }, { status: 400 });
        }

        // Check if this is client's first appointment
        const { count: appointmentCount, error: countError } = await supabase
            .from('appointments')
            .select('*', { count: 'exact', head: true })
            .eq('client_id', clientId)
            .eq('professional_id', nutritionistProfile.id);

        if (countError) {
            console.error('❌ Count error:', countError);
            return NextResponse.json({
                error: 'Error checking appointment history'
            }, { status: 500 });
        }

        const isFirstConsult = (appointmentCount || 0) === 0;
        const price = isFirstConsult ? 0 : (nutritionistProfile.hourly_rate || 0);

        console.log('💰 Pricing info:', { isFirstConsult, price, appointmentCount });

        // Use the PostgreSQL function to insert the appointment with proper timezone conversion
        const { data: newAppointment, error: insertError } = await supabase
            .rpc('insert_appointment_with_timezone', {
                p_client_id: clientId,
                p_professional_id: nutritionistProfile.id,
                p_start_time_local: localStartTime,
                p_end_time_local: localEndTime,
                p_timezone: nutritionistTimezone,
                p_price: price,
                p_is_first_consult: isFirstConsult,
                p_status: 'confirmed',
                p_session_type: sessionType || 'follow-up',
                p_session_notes: sessionNotes || null
            });

        if (insertError) {
            console.error('❌ Insert error:', insertError);

            if (insertError.message.includes('conflicts with existing booking')) {
                return NextResponse.json({
                    error: 'This time slot conflicts with an existing appointment'
                }, { status: 409 });
            }

            if (insertError.message.includes('not available')) {
                return NextResponse.json({
                    error: 'Professional is not available at this time'
                }, { status: 400 });
            }

            return NextResponse.json({
                error: 'Failed to create appointment: ' + insertError.message
            }, { status: 500 });
        }

        console.log('✅ Appointment created successfully:', newAppointment[0]?.id);

        // Try to create Google Meet link (existing code)
        let meetingLinkCreated = false;
        let meetingLink = null;

        try {
            if (nutritionistProfile.google_refresh_token && clientProfile.email) {
                console.log('🎥 Creating Google Meet link...');

                const meetingResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/create-meeting`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        appointmentId: newAppointment[0].id,
                        professionalProfileId: nutritionistProfile.id,
                        clientEmail: clientProfile.email,
                        startTime: newAppointment[0].start_time,
                        endTime: newAppointment[0].end_time,
                    }),
                });

                if (meetingResponse.ok) {
                    const meetingData = await meetingResponse.json();
                    meetingLink = meetingData.meetingLink;
                    meetingLinkCreated = true;

                    // Update appointment with meeting link
                    await supabase
                        .from('appointments')
                        .update({
                            meeting_link: meetingLink,
                            updated_at: new Date().toISOString()
                        })
                        .eq('id', newAppointment[0].id);

                    console.log('✅ Meeting link created and updated');
                }
            }
        } catch (meetingError) {
            console.error('💥 Google Meet creation failed:', meetingError);
            // Continue without meeting link
        }

        console.log('🎉 Session scheduling completed');

        return NextResponse.json({
            success: true,
            appointment: newAppointment[0],
            isFirstConsult,
            message: meetingLinkCreated
                ? 'Session scheduled successfully with Google Meet link!'
                : 'Session scheduled successfully! Meeting link will be sent separately.',
        });

    } catch (error) {
        console.error('💥 Unexpected error in schedule-session:', error);
        return NextResponse.json({
            error: 'Internal server error',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}