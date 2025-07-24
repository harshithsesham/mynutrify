// app/api/book-appointment/route.ts
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { addHours, isAfter, parseISO } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

export async function POST(req: NextRequest) {
    const supabase = createRouteHandlerClient({ cookies });

    try {
        const {
            professionalId,
            startTime,    // ISO string in UTC
            endTime,      // ISO string in UTC
        } = await req.json();

        // Validate input
        if (!professionalId || !startTime || !endTime) {
            return NextResponse.json({
                error: 'Missing required fields'
            }, { status: 400 });
        }

        // Get authenticated user
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({
                error: 'Authentication required'
            }, { status: 401 });
        }

        // Get client profile
        const { data: clientProfile, error: profileError } = await supabase
            .from('profiles')
            .select('id')
            .eq('user_id', user.id)
            .single();

        if (profileError || !clientProfile) {
            return NextResponse.json({
                error: 'Client profile not found'
            }, { status: 404 });
        }

        // Parse appointment times - they're already in UTC
        const appointmentStartTime = parseISO(startTime);
        const appointmentEndTime = parseISO(endTime);

        // Validation 1: Check if appointment is at least 1 hour in future
        const minBookableTime = addHours(new Date(), 1);
        if (!isAfter(appointmentStartTime, minBookableTime)) {
            return NextResponse.json({
                error: 'Appointments must be booked at least 1 hour in advance'
            }, { status: 400 });
        }

        // Get professional's timezone
        const { data: professionalProfile, error: profTimezoneError } = await supabase
            .from('profiles')
            .select('timezone, hourly_rate')
            .eq('id', professionalId)
            .single();

        if (profTimezoneError || !professionalProfile) {
            return NextResponse.json({
                error: 'Professional not found'
            }, { status: 404 });
        }

        const professionalTimezone = professionalProfile.timezone || 'UTC';

        // Convert appointment time to professional's timezone for availability check
        const appointmentInProfTimezone = toZonedTime(appointmentStartTime, professionalTimezone);

        // Get day of week in professional's timezone
        // JavaScript: 0=Sunday, 1=Monday, ..., 6=Saturday
        // Database: 0=Monday, 1=Tuesday, ..., 6=Sunday
        const jsDayOfWeek = appointmentInProfTimezone.getDay();
        const dbDayOfWeek = jsDayOfWeek === 0 ? 6 : jsDayOfWeek - 1;

        // Get hour in professional's timezone
        const appointmentHourInProfTimezone = appointmentInProfTimezone.getHours();

        console.log('Timezone conversion:', {
            utcTime: startTime,
            professionalTimezone,
            localTime: appointmentInProfTimezone,
            dayOfWeek: dbDayOfWeek,
            hour: appointmentHourInProfTimezone
        });

        // Check professional availability
        const { data: availability, error: availError } = await supabase
            .from('availability')
            .select('start_time, end_time')
            .eq('professional_id', professionalId)
            .eq('day_of_week', dbDayOfWeek)
            .single();

        if (availError || !availability) {
            const dayName = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][dbDayOfWeek];
            return NextResponse.json({
                error: `Professional is not available on ${dayName}s`
            }, { status: 400 });
        }

        const availStart = parseInt(availability.start_time.split(':')[0]);
        const availEnd = parseInt(availability.end_time.split(':')[0]);

        if (appointmentHourInProfTimezone < availStart || appointmentHourInProfTimezone >= availEnd) {
            return NextResponse.json({
                error: `This time (${appointmentHourInProfTimezone}:00 ${professionalTimezone}) is outside the professional's working hours (${availability.start_time} - ${availability.end_time} ${professionalTimezone})`
            }, { status: 400 });
        }

        // Validation 3: Double-booking prevention
        const { data: existingAppointment, error: conflictError } = await supabase
            .from('appointments')
            .select('id')
            .eq('professional_id', professionalId)
            .eq('status', 'confirmed')
            .gte('start_time', startTime)
            .lt('start_time', endTime)
            .maybeSingle();

        if (conflictError) {
            console.error('Conflict check error:', conflictError);
            return NextResponse.json({
                error: 'Error checking appointment availability'
            }, { status: 500 });
        }

        if (existingAppointment) {
            return NextResponse.json({
                error: 'This time slot has been booked by someone else'
            }, { status: 409 });
        }

        // Check if this is client's first appointment with this professional
        const { count: appointmentCount, error: countError } = await supabase
            .from('appointments')
            .select('*', { count: 'exact', head: true })
            .eq('client_id', clientProfile.id)
            .eq('professional_id', professionalId);

        if (countError) {
            console.error('Count error:', countError);
            return NextResponse.json({
                error: 'Error checking appointment history'
            }, { status: 500 });
        }

        const isFirstConsult = (appointmentCount || 0) === 0;
        const price = isFirstConsult ? 0 : (professionalProfile.hourly_rate || 0);

        // Create appointment with database-level validation
        const { data: newAppointment, error: insertError } = await supabase
            .from('appointments')
            .insert({
                client_id: clientProfile.id,
                professional_id: professionalId,
                start_time: startTime,  // Store in UTC
                end_time: endTime,      // Store in UTC
                price: price,
                is_first_consult: isFirstConsult,
                status: 'confirmed',
                is_request_handled: false,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .select()
            .single();

        if (insertError) {
            console.error('Insert error:', insertError);

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

        return NextResponse.json({
            success: true,
            appointment: newAppointment,
            isFirstConsult
        });

    } catch (error) {
        console.error('Booking API error:', error);
        return NextResponse.json({
            error: 'Internal server error'
        }, { status: 500 });
    }
}