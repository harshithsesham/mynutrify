// frontend/src/app/api/nutritionist/schedule-session/route.ts
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { addHours, isAfter } from 'date-fns';
import { fromZonedTime, toZonedTime, format as formatTz } from 'date-fns-tz';

const INDIA_TIMEZONE = 'Asia/Kolkata';

export async function POST(req: NextRequest) {
    // FIX: Await cookies() for Next.js 15 compatibility
    const cookieStore = await cookies();

    // FIX: Pass the awaited cookie store and cast to any
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore as any });

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
            .select('id, full_name, role, hourly_rate, google_refresh_token')
            .eq('user_id', user.id)
            .single();

        if (profileError || !nutritionistProfile) {
            console.error('❌ Nutritionist profile not found:', profileError);
            return NextResponse.json({
                error: 'Nutritionist profile not found'
            }, { status: 404 });
        }

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

        // FIX: Parse the time specifically as IST using date-fns-tz
        // This takes the "YYYY-MM-DDTHH:mm" string and treats it as Asia/Kolkata
        // before converting it to a UTC Date object for the database.
        const appointmentStartTime = fromZonedTime(startTime, INDIA_TIMEZONE);
        const appointmentEndTime = addHours(appointmentStartTime, duration / 60);

        console.log('📅 Appointment times:', {
            input: startTime,
            parsedIST: formatTz(appointmentStartTime, 'yyyy-MM-dd HH:mm:ss zzz', { timeZone: INDIA_TIMEZONE }),
            utcISO: appointmentStartTime.toISOString()
        });

        // For logging purposes - convert to India time
        const appointmentInIndiaTime = toZonedTime(appointmentStartTime, INDIA_TIMEZONE);

        // Only validate that appointment is not in the past
        const now = new Date();
        if (!isAfter(appointmentStartTime, now)) {
            console.error('❌ Appointment in the past');
            return NextResponse.json({
                error: 'Cannot schedule appointments in the past'
            }, { status: 400 });
        }

        // Check for double-booking (prevent scheduling over existing appointments)
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
            return NextResponse.json({
                error: 'This time slot conflicts with an existing appointment'
            }, { status: 409 });
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

        // Create appointment
        const { data: newAppointment, error: insertError } = await supabase
            .from('appointments')
            .insert({
                client_id: clientId,
                professional_id: nutritionistProfile.id,
                start_time: appointmentStartTime.toISOString(),
                end_time: appointmentEndTime.toISOString(),
                price: price,
                is_first_consult: isFirstConsult,
                status: 'confirmed',
                is_request_handled: false,
                session_type: sessionType || 'follow-up',
                session_notes: sessionNotes || null,
                meeting_link: null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .select()
            .single();

        if (insertError) {
            console.error('❌ Insert error:', insertError);
            return NextResponse.json({
                error: 'Failed to create appointment: ' + insertError.message
            }, { status: 500 });
        }

        console.log('✅ Appointment created successfully:', newAppointment.id);

        // Try to create Google Meet link
        let meetingLinkCreated = false;
        let meetingLink = null;

        try {
            // Check if nutritionist has Google Calendar connected
            if (!nutritionistProfile.google_refresh_token) {
                console.warn('⚠️ Nutritionist has not connected Google Calendar');
                throw new Error('Google Calendar not connected');
            }

            // Get client email
            let clientEmail = clientProfile.email;

            if (!clientEmail && clientProfile.user_id) {
                const { data: emailFromRPC } = await supabase
                    .rpc('get_user_email', { user_uuid: clientProfile.user_id });

                if (emailFromRPC) {
                    clientEmail = emailFromRPC;
                    await supabase.from('profiles').update({ email: emailFromRPC }).eq('id', clientId);
                }
            }

            if (!clientEmail) throw new Error('Client email not found');

            // Prepare meeting creation payload
            const meetingPayload = {
                appointmentId: newAppointment.id,
                professionalProfileId: nutritionistProfile.id,
                clientEmail: clientEmail,
                startTime: newAppointment.start_time,
                endTime: newAppointment.end_time,
            };

            const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
            const meetingResponse = await fetch(`${baseUrl}/api/create-meeting`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Cookie': req.headers.get('cookie') || ''
                },
                body: JSON.stringify(meetingPayload),
            });

            if (meetingResponse.ok) {
                const meetingData = await meetingResponse.json();
                meetingLink = meetingData.meetingLink;

                if (meetingLink) {
                    await supabase
                        .from('appointments')
                        .update({
                            meeting_link: meetingLink,
                            updated_at: new Date().toISOString()
                        })
                        .eq('id', newAppointment.id);

                    newAppointment.meeting_link = meetingLink;
                    meetingLinkCreated = true;
                }
            }
        } catch (meetingError) {
            console.error('💥 Google Meet creation failed:', meetingError);

            if (!meetingLinkCreated) {
                const placeholderLink = `Meeting link will be sent separately`;
                await supabase
                    .from('appointments')
                    .update({ meeting_link: placeholderLink })
                    .eq('id', newAppointment.id);
                newAppointment.meeting_link = placeholderLink;
            }
        }

        return NextResponse.json({
            success: true,
            appointment: newAppointment,
            isFirstConsult,
            message: meetingLinkCreated
                ? 'Session scheduled successfully with Google Meet link!'
                : 'Session scheduled successfully! Meeting link will be sent separately.',
            scheduling_info: {
                appointment_time_ist: formatTz(appointmentInIndiaTime, 'yyyy-MM-dd HH:mm:ss zzz', {
                    timeZone: INDIA_TIMEZONE
                })
            }
        });

    } catch (error) {
        console.error('💥 Unexpected error in schedule-session:', error);
        return NextResponse.json({
            error: 'Internal server error',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}