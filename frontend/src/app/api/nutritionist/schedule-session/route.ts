// app/api/nutritionist/schedule-session/route.ts
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { addHours, isAfter, parseISO } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

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

        console.log('✅ Nutritionist profile found:', nutritionistProfile.full_name);
        console.log('🌍 Nutritionist timezone:', nutritionistProfile.timezone || 'UTC');
        console.log('🔑 Has Google Calendar connected:', !!nutritionistProfile.google_refresh_token);

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
        console.log('📧 Client email:', clientProfile.email);

        // IMPORTANT: The startTime coming from the client is already in ISO format with UTC
        // It should be something like "2024-12-20T11:00" (local time without timezone)
        // We need to interpret this as the nutritionist's local time and convert to UTC

        const nutritionistTimezone = nutritionistProfile.timezone || 'UTC';

        // Parse the incoming time
        let appointmentStartTime: Date;
        let appointmentEndTime: Date;

        if (startTime.includes('T') && !startTime.includes('Z') && !startTime.includes('+') && !startTime.includes('-')) {
            // This is a local datetime without timezone info (e.g., "2024-12-20T11:00")
            // We need to interpret it as the nutritionist's timezone
            console.log('📅 Received local time:', startTime);

            // Create a date object from the string
            const localDate = parseISO(startTime);
            console.log('🕐 Parsed as local date:', localDate.toString());

            // This is already in the nutritionist's local time, so we just use it
            appointmentStartTime = localDate;
            appointmentEndTime = addHours(appointmentStartTime, duration / 60);

            console.log('🌍 Nutritionist timezone:', nutritionistTimezone);
            console.log('📅 Appointment local time:', appointmentStartTime.toString());
            console.log('🌐 Appointment UTC time:', appointmentStartTime.toISOString());

        } else if (startTime.includes('Z') || startTime.includes('+') || startTime.includes('-')) {
            // This is already a full ISO string with timezone
            appointmentStartTime = parseISO(startTime);
            appointmentEndTime = addHours(appointmentStartTime, duration / 60);

            console.log('📅 Received UTC/timezone time:', startTime);
            console.log('🌐 Parsed as:', appointmentStartTime.toISOString());
        } else {
            // Fallback: treat as ISO string
            appointmentStartTime = parseISO(startTime);
            appointmentEndTime = addHours(appointmentStartTime, duration / 60);

            console.log('📅 Fallback parsing:', startTime);
            console.log('🌐 Parsed as:', appointmentStartTime.toISOString());
        }

        console.log('📅 Final appointment times:', {
            start: appointmentStartTime.toISOString(),
            end: appointmentEndTime.toISOString(),
            duration: duration + ' minutes'
        });

        // Validation: Check if appointment is at least 1 hour in future
        const minBookableTime = addHours(new Date(), 1);
        if (!isAfter(appointmentStartTime, minBookableTime)) {
            console.error('❌ Appointment too soon');
            return NextResponse.json({
                error: 'Appointments must be scheduled at least 1 hour in advance'
            }, { status: 400 });
        }

        // Check for double-booking
        const { data: existingAppointment, error: conflictError } = await supabase
            .from('appointments')
            .select('id')
            .eq('professional_id', nutritionistProfile.id)
            .eq('status', 'confirmed')
            .gte('start_time', appointmentStartTime.toISOString())
            .lt('start_time', appointmentEndTime.toISOString())
            .maybeSingle();

        if (conflictError) {
            console.error('❌ Conflict check error:', conflictError);
            return NextResponse.json({
                error: 'Error checking appointment availability'
            }, { status: 500 });
        }

        if (existingAppointment) {
            console.error('❌ Time slot conflict');
            return NextResponse.json({
                error: 'This time slot has been booked by someone else'
            }, { status: 409 });
        }

        console.log('✅ No scheduling conflicts found');

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

        // Create appointment - store in UTC
        const { data: newAppointment, error: insertError } = await supabase
            .from('appointments')
            .insert({
                client_id: clientId,
                professional_id: nutritionistProfile.id,
                start_time: appointmentStartTime.toISOString(),  // Store in UTC
                end_time: appointmentEndTime.toISOString(),      // Store in UTC
                price: price,
                is_first_consult: isFirstConsult,
                status: 'confirmed',
                is_request_handled: false,
                session_type: sessionType || 'follow-up',
                session_notes: sessionNotes || null,
                meeting_link: null, // Will be updated after creating Google Meet
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .select()
            .single();

        if (insertError) {
            console.error('❌ Insert error:', insertError);
            console.error('Insert error details:', {
                code: insertError.code,
                message: insertError.message,
                details: insertError.details,
                hint: insertError.hint
            });

            if (insertError.code === '23505') {
                return NextResponse.json({
                    error: 'This time slot has just been booked by someone else'
                }, { status: 409 });
            }

            // Parse the error message for more specific feedback
            if (insertError.message.includes('outside professional availability')) {
                // Extract the details from the error message
                const match = insertError.message.match(/(\d{1,2}:\d{2}) (\S+) not between (\d{1,2}:\d{2})-(\d{1,2}:\d{2})/);
                if (match) {
                    return NextResponse.json({
                        error: `This time (${match[1]} ${match[2]}) is outside your availability hours (${match[3]}-${match[4]} ${match[2]}). Please check your availability settings.`
                    }, { status: 400 });
                }
                return NextResponse.json({
                    error: 'This time is outside your configured availability hours. Please check your settings.'
                }, { status: 400 });
            }

            return NextResponse.json({
                error: 'Failed to create appointment: ' + insertError.message
            }, { status: 500 });
        }

        console.log('✅ Appointment created successfully:', newAppointment.id);

        // Try to create Google Meet link
        let meetingLinkCreated = false;
        let meetingLink = null;

        try {
            console.log('🎥 Starting Google Meet creation process...');

            // Check if nutritionist has Google Calendar connected
            if (!nutritionistProfile.google_refresh_token) {
                console.warn('⚠️ Nutritionist has not connected Google Calendar');
                throw new Error('Google Calendar not connected');
            }

            // Get client email
            let clientEmail = clientProfile.email;

            // If email is not in profile, try to get it from auth.users
            if (!clientEmail && clientProfile.user_id) {
                console.log('📧 Email not in profile, trying to get from auth.users...');

                const { data: emailFromRPC, error: rpcError } = await supabase
                    .rpc('get_user_email', { user_uuid: clientProfile.user_id });

                if (!rpcError && emailFromRPC) {
                    clientEmail = emailFromRPC;
                    console.log('✅ Got email from auth.users:', clientEmail);

                    // Update profile with email for future use
                    await supabase
                        .from('profiles')
                        .update({ email: emailFromRPC })
                        .eq('id', clientId);
                }
            }

            if (!clientEmail) {
                console.error('❌ Client email not found');
                throw new Error('Client email not found');
            }

            console.log('📧 Using client email:', clientEmail);

            // Prepare meeting creation payload
            const meetingPayload = {
                appointmentId: newAppointment.id,
                professionalProfileId: nutritionistProfile.id,
                clientEmail: clientEmail,
                startTime: newAppointment.start_time,
                endTime: newAppointment.end_time,
            };

            console.log('🔗 Calling create-meeting API with payload:', JSON.stringify(meetingPayload, null, 2));

            // Call the create-meeting API
            const meetingResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/create-meeting`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(meetingPayload),
            });

            console.log('📡 Meeting API response status:', meetingResponse.status);

            if (meetingResponse.ok) {
                const meetingData = await meetingResponse.json();
                console.log('✅ Meeting API response:', meetingData);

                meetingLink = meetingData.meetingLink;

                if (meetingLink) {
                    console.log('🔗 Meeting link received:', meetingLink);

                    // Update the appointment with the meeting link
                    const { data: updatedAppointment, error: updateError } = await supabase
                        .from('appointments')
                        .update({
                            meeting_link: meetingLink,
                            updated_at: new Date().toISOString()
                        })
                        .eq('id', newAppointment.id)
                        .select()
                        .single();

                    if (updateError) {
                        console.error('❌ Error updating appointment with meeting link:', updateError);
                    } else {
                        console.log('✅ Appointment updated with meeting link successfully');
                        newAppointment.meeting_link = meetingLink;
                        meetingLinkCreated = true;
                    }
                } else {
                    console.warn('⚠️ No meeting link returned from create-meeting API');
                }
            } else {
                const errorText = await meetingResponse.text();
                console.error('❌ Meeting API failed:', meetingResponse.status, errorText);

                try {
                    const errorJson = JSON.parse(errorText);
                    throw new Error(errorJson.error || 'Meeting creation failed');
                } catch (e) {
                    throw new Error(`Meeting creation failed: ${errorText}`);
                }
            }
        } catch (meetingError) {
            console.error('💥 Google Meet creation failed:', meetingError);
            console.error('Error details:', meetingError instanceof Error ? meetingError.message : meetingError);

            // If meeting creation fails, add a fallback or placeholder
            if (!meetingLinkCreated) {
                console.log('📎 Attempting to add placeholder meeting link...');

                const placeholderLink = `Meeting link will be sent separately`;

                await supabase
                    .from('appointments')
                    .update({
                        meeting_link: placeholderLink,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', newAppointment.id);

                newAppointment.meeting_link = placeholderLink;
            }
        }

        console.log('🎉 Session scheduling completed');

        // Return response
        return NextResponse.json({
            success: true,
            appointment: newAppointment,
            isFirstConsult,
            message: meetingLinkCreated
                ? 'Session scheduled successfully with Google Meet link!'
                : 'Session scheduled successfully! Meeting link will be sent separately.',
            warning: !meetingLinkCreated
                ? 'Google Meet link could not be created. Please check your Google Calendar connection or send the meeting link manually.'
                : undefined
        });

    } catch (error) {
        console.error('💥 Unexpected error in schedule-session:', error);
        return NextResponse.json({
            error: 'Internal server error',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}