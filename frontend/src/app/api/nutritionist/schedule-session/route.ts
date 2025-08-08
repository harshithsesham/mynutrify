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

        // Try to create Google Meet link - using alternative method to get client email
        try {
            console.log('📧 Attempting to create Google Meet link...');

            // Alternative 1: Try to get client email from their profile if stored there
            const { data: clientWithEmail, error: clientEmailError } = await supabase
                .from('profiles')
                .select('user_id, email')
                .eq('id', clientId)
                .single();

            let clientEmail = clientWithEmail?.email;

            // Alternative 2: If email not in profile, try using RPC to get user email
            if (!clientEmail && clientWithEmail?.user_id) {
                console.log('📧 Email not in profile, trying RPC method...');

                try {
                    // Create a simple RPC function to get user email (run this SQL in Supabase):
                    // CREATE OR REPLACE FUNCTION get_user_email(user_uuid uuid)
                    // RETURNS text AS $
                    // BEGIN
                    //   RETURN (SELECT email FROM auth.users WHERE id = user_uuid);
                    // END;
                    // $ LANGUAGE plpgsql SECURITY DEFINER;

                    const { data: emailData, error: rpcError } = await supabase
                        .rpc('get_user_email', { user_uuid: clientWithEmail.user_id });

                    if (!rpcError && emailData) {
                        clientEmail = emailData;
                        console.log('✅ Got client email via RPC');
                    }
                } catch (rpcError) {
                    console.log('⚠️ RPC method failed, trying direct approach...');
                }
            }

            // Alternative 3: For now, let's use a placeholder or try to get from consultation request
            if (!clientEmail) {
                console.log('📧 Trying to get email from consultation request...');

                // Try to find the consultation request that led to this assignment
                const { data: consultationWithEmail } = await supabase
                    .from('consultation_requests')
                    .select('email')
                    .eq('client_id', clientId)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle();

                if (consultationWithEmail?.email) {
                    clientEmail = consultationWithEmail.email;
                    console.log('✅ Found client email from consultation request');
                }
            }

            console.log('📧 Client email found:', clientEmail ? 'Yes' : 'No');

            if (!clientEmail) {
                console.warn('⚠️ Could not get client email - skipping Google Meet creation');
                throw new Error('Client email not found');
            }

            console.log('🔗 Calling create-meeting API...');

            const meetingResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/create-meeting`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    appointmentId: newAppointment.id,
                    professionalProfileId: nutritionistProfile.id,
                    clientEmail: clientEmail,
                    startTime: newAppointment.start_time,
                    endTime: newAppointment.end_time,
                }),
            });

            console.log('📡 Meeting API response status:', meetingResponse.status);

            if (meetingResponse.ok) {
                const meetingData = await meetingResponse.json();
                console.log('✅ Meeting API response:', meetingData);

                const meetingLink = meetingData.meetingLink;

                if (meetingLink) {
                    console.log('🔗 Updating appointment with meeting link...');

                    // Update the appointment with the meeting link
                    const { error: updateError } = await supabase
                        .from('appointments')
                        .update({ meeting_link: meetingLink })
                        .eq('id', newAppointment.id);

                    if (updateError) {
                        console.error('❌ Error updating appointment with meeting link:', updateError);
                    } else {
                        console.log('✅ Appointment updated with meeting link successfully');
                        newAppointment.meeting_link = meetingLink;
                    }
                } else {
                    console.warn('⚠️ No meeting link returned from create-meeting API');
                }
            } else {
                const errorText = await meetingResponse.text();
                console.error('❌ Meeting API failed:', meetingResponse.status, errorText);
            }
        } catch (meetingError) {
            console.error('💥 Google Meet creation failed:', meetingError);
            // Continue without meeting link - appointment is still created
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