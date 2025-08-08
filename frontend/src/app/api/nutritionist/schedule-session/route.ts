// app/api/nutritionist/schedule-session/route.ts
// FIXED VERSION - Based on the working book-appointment API

import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { addHours, isAfter, parseISO } from 'date-fns';

export async function POST(req: NextRequest) {
    const supabase = createRouteHandlerClient({ cookies });

    try {
        console.log('🔥 Schedule session API called');

        const requestBody = await req.json();
        console.log('📝 Request body:', JSON.stringify(requestBody, null, 2));

        const { clientId, startTime, duration, sessionType, sessionNotes } = requestBody;

        // Validate input - similar to book-appointment
        if (!clientId || !startTime || !duration) {
            console.error('❌ Missing required fields');
            return NextResponse.json({
                error: 'Missing required fields: clientId, startTime, or duration'
            }, { status: 400 });
        }

        // Get authenticated user (nutritionist)
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            console.error('❌ Authentication failed');
            return NextResponse.json({
                error: 'Authentication required'
            }, { status: 401 });
        }

        console.log('✅ User authenticated:', user.id);

        // Get nutritionist profile - similar to book-appointment's professional lookup
        const { data: nutritionistProfile, error: profileError } = await supabase
            .from('profiles')
            .select('id, full_name, role, hourly_rate')
            .eq('user_id', user.id)
            .single();

        if (profileError || !nutritionistProfile) {
            console.error('❌ Nutritionist profile not found:', profileError);
            return NextResponse.json({
                error: 'Nutritionist profile not found'
            }, { status: 404 });
        }

        console.log('✅ Nutritionist profile found:', nutritionistProfile.full_name);

        // Validate client exists - similar to book-appointment's client profile check
        const { data: clientProfile, error: clientError } = await supabase
            .from('profiles')
            .select('id, full_name')
            .eq('id', clientId)
            .single();

        if (clientError || !clientProfile) {
            console.error('❌ Client profile not found:', clientError);
            return NextResponse.json({
                error: 'Client profile not found'
            }, { status: 404 });
        }

        console.log('✅ Client profile found:', clientProfile.full_name);

        // Parse and validate times - exactly like book-appointment
        const appointmentStartTime = parseISO(startTime);
        const appointmentEndTime = addHours(appointmentStartTime, duration / 60); // Convert minutes to hours

        console.log('📅 Appointment times:', {
            start: appointmentStartTime.toISOString(),
            end: appointmentEndTime.toISOString(),
            duration: duration + ' minutes'
        });

        // Validation 1: Check if appointment is at least 1 hour in future - same as book-appointment
        const minBookableTime = addHours(new Date(), 1);
        if (!isAfter(appointmentStartTime, minBookableTime)) {
            console.error('❌ Appointment too soon');
            return NextResponse.json({
                error: 'Appointments must be scheduled at least 1 hour in advance'
            }, { status: 400 });
        }

        // Validation 2: Double-booking prevention - same logic as book-appointment
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

        // Check if this is client's first appointment with this professional - same as book-appointment
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

        // Create appointment - using EXACT same structure as book-appointment
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
                is_request_handled: false, // Same as book-appointment
                session_type: sessionType || 'follow-up',
                session_notes: sessionNotes || null,
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

            // Same error handling as book-appointment
            if (insertError.code === '23505') {
                return NextResponse.json({
                    error: 'This time slot has just been booked by someone else'
                }, { status: 409 });
            }

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

        console.log('✅ Appointment created successfully:', newAppointment.id);

        // Try to create Google Meet link - same logic as your working flow
        try {
            // Get client's email for Google Meet creation
            const { data: { user: clientUser }, error: clientUserError } = await supabase.auth.admin.getUserById(
                // We need to get the client's user_id first
                (await supabase.from('profiles').select('user_id').eq('id', clientId).single()).data?.user_id
            );

            if (!clientUserError && clientUser?.email) {
                console.log('📧 Creating Google Meet link...');

                const meetingResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/create-meeting`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        appointmentId: newAppointment.id,
                        professionalProfileId: nutritionistProfile.id,
                        clientEmail: clientUser.email,
                        startTime: newAppointment.start_time,
                        endTime: newAppointment.end_time,
                    }),
                });

                if (meetingResponse.ok) {
                    const { meetingLink } = await meetingResponse.json();
                    console.log('✅ Google Meet link created:', meetingLink);

                    // Update the appointment with the meeting link
                    await supabase
                        .from('appointments')
                        .update({ meeting_link: meetingLink })
                        .eq('id', newAppointment.id);

                    newAppointment.meeting_link = meetingLink;
                } else {
                    console.warn('⚠️ Failed to create Google Meet link (non-critical)');
                }
            }
        } catch (meetingError) {
            console.warn('⚠️ Google Meet creation failed (non-critical):', meetingError);
        }

        console.log('🎉 Session scheduled successfully');

        // Return same format as book-appointment
        return NextResponse.json({
            success: true,
            appointment: newAppointment,
            isFirstConsult,
            message: 'Session scheduled successfully'
        });

    } catch (error) {
        console.error('💥 Booking API error:', error);
        return NextResponse.json({
            error: 'Internal server error'
        }, { status: 500 });
    }
}