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

        // Enhanced time format validation and parsing
        let localStartTime: string;
        let localEndTime: string;

        try {
            // Check for different possible formats
            if (typeof startTime !== 'string') {
                throw new Error('startTime must be a string');
            }

            // Remove any timezone indicators if present (Z, +XX:XX, -XX:XX)
            let cleanStartTime = startTime.trim();

            // If it's a full ISO string with timezone, extract local part
            if (cleanStartTime.includes('Z')) {
                // This is UTC time, we need to convert to local
                const utcDate = new Date(cleanStartTime);
                if (isNaN(utcDate.getTime())) {
                    throw new Error('Invalid UTC datetime format');
                }

                // Convert to nutritionist's timezone
                const localDate = new Date(utcDate.toLocaleString('en-US', { timeZone: nutritionistTimezone }));
                const year = localDate.getFullYear();
                const month = String(localDate.getMonth() + 1).padStart(2, '0');
                const day = String(localDate.getDate()).padStart(2, '0');
                const hours = String(localDate.getHours()).padStart(2, '0');
                const minutes = String(localDate.getMinutes()).padStart(2, '0');

                cleanStartTime = `${year}-${month}-${day}T${hours}:${minutes}`;
            } else if (cleanStartTime.includes('+') || cleanStartTime.match(/-\d{2}:\d{2}$/)) {
                // This has timezone offset, convert to local
                const dateWithTz = new Date(cleanStartTime);
                if (isNaN(dateWithTz.getTime())) {
                    throw new Error('Invalid datetime with timezone format');
                }

                const localDate = new Date(dateWithTz.toLocaleString('en-US', { timeZone: nutritionistTimezone }));
                const year = localDate.getFullYear();
                const month = String(localDate.getMonth() + 1).padStart(2, '0');
                const day = String(localDate.getDate()).padStart(2, '0');
                const hours = String(localDate.getHours()).padStart(2, '0');
                const minutes = String(localDate.getMinutes()).padStart(2, '0');

                cleanStartTime = `${year}-${month}-${day}T${hours}:${minutes}`;
            }

            // Validate the expected local format: YYYY-MM-DDTHH:MM or YYYY-MM-DDTHH:MM:SS
            const localTimePattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/;
            if (!localTimePattern.test(cleanStartTime)) {
                throw new Error(`Expected local time format YYYY-MM-DDTHH:MM, got: ${cleanStartTime}`);
            }

            // Ensure we have seconds
            if (!cleanStartTime.includes(':', cleanStartTime.lastIndexOf(':') + 1)) {
                cleanStartTime += ':00';
            }

            console.log('🕐 Parsed local start time:', cleanStartTime);

            // Parse the components for validation
            const [datePart, timePart] = cleanStartTime.split('T');
            const [hourStr, minuteStr] = timePart.split(':');
            const hour = parseInt(hourStr);
            const minute = parseInt(minuteStr);

            // Validate hour and minute ranges
            if (hour < 0 || hour > 23) {
                throw new Error(`Invalid hour: ${hour}. Must be 0-23`);
            }
            if (minute < 0 || minute > 59) {
                throw new Error(`Invalid minute: ${minute}. Must be 0-59`);
            }

            localStartTime = `${datePart} ${hourStr.padStart(2, '0')}:${minuteStr.padStart(2, '0')}:00`;

            // Calculate end time
            const endHour = hour + Math.floor(duration / 60);
            const endMinute = minute + (duration % 60);
            const adjustedEndHour = endHour + Math.floor(endMinute / 60);
            const adjustedEndMinute = endMinute % 60;

            // Validate end time doesn't go beyond 24 hours
            if (adjustedEndHour >= 24) {
                throw new Error('Session would extend beyond midnight. Please choose an earlier start time.');
            }

            localEndTime = `${datePart} ${adjustedEndHour.toString().padStart(2, '0')}:${adjustedEndMinute.toString().padStart(2, '0')}:00`;

            console.log('🕐 Calculated local end time:', localEndTime);

        } catch (timeError) {
            console.error('❌ Time parsing error:', timeError);
            return NextResponse.json({
                error: `Invalid time format: ${timeError instanceof Error ? timeError.message : 'Unknown time format error'}`
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