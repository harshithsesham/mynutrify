// app/api/book-appointment/route.ts
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { addHours, isAfter, parseISO, isValid } from 'date-fns';
import { toZonedTime, format as formatTz } from 'date-fns-tz';

export async function POST(req: NextRequest) {
    const supabase = createRouteHandlerClient({ cookies });

    try {
        const body = await req.json();
        const professionalId: string | undefined = body?.professionalId;
        const startTime: string | undefined = body?.startTime; // ISO in UTC
        const endTime: string | undefined = body?.endTime;     // ISO in UTC

        // Basic validation
        if (!professionalId || !startTime || !endTime) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Auth
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        // Client profile
        const { data: clientProfile, error: profileError } = await supabase
            .from('profiles')
            .select('id')
            .eq('user_id', user.id)
            .single();

        if (profileError || !clientProfile) {
            return NextResponse.json({ error: 'Client profile not found' }, { status: 404 });
        }

        // Parse requested times (UTC)
        const appointmentStartTime = parseISO(startTime);
        const appointmentEndTime = parseISO(endTime);

        if (!isValid(appointmentStartTime) || !isValid(appointmentEndTime)) {
            return NextResponse.json({ error: 'Invalid datetime format' }, { status: 400 });
        }
        if (!(appointmentEndTime > appointmentStartTime)) {
            return NextResponse.json({ error: 'End time must be after start time' }, { status: 400 });
        }

        // Must be at least 1 hour in the future
        const minBookableTime = addHours(new Date(), 1);
        if (!isAfter(appointmentStartTime, minBookableTime)) {
            return NextResponse.json(
                { error: 'Appointments must be booked at least 1 hour in advance' },
                { status: 400 }
            );
        }

        // Professional profile (for TZ + rate + name)
        const { data: professionalProfile, error: profTimezoneError } = await supabase
            .from('profiles')
            .select('timezone, hourly_rate, full_name')
            .eq('id', professionalId)
            .single();

        if (profTimezoneError || !professionalProfile) {
            return NextResponse.json({ error: 'Professional not found' }, { status: 404 });
        }

        const professionalTimezone = professionalProfile.timezone || 'Asia/Kolkata';

        // Convert UTC → professional TZ for availability check
        const appointmentInProfTimezone = toZonedTime(appointmentStartTime, professionalTimezone);

        // Map JS day to DB day (JS: Sun=0..Sat=6  → DB: Mon=0..Sun=6)
        const jsDayOfWeek = appointmentInProfTimezone.getDay(); // 0..6
        const dbDayOfWeek = jsDayOfWeek === 0 ? 6 : jsDayOfWeek - 1;

        // Local hour within availability window
        const appointmentHourInProfTimezone = appointmentInProfTimezone.getHours();

        // Fetch availability row for that weekday
        const { data: availability, error: availError } = await supabase
            .from('availability')
            .select('start_time, end_time')
            .eq('professional_id', professionalId)
            .eq('day_of_week', dbDayOfWeek)
            .single();

        if (availError || !availability) {
            const dayName = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][dbDayOfWeek];
            return NextResponse.json(
                { error: `${professionalProfile.full_name} is not available on ${dayName}s` },
                { status: 400 }
            );
        }

        const availStart = parseInt(availability.start_time.split(':')[0], 10);
        const availEnd = parseInt(availability.end_time.split(':')[0], 10);

        const withinHours =
            appointmentHourInProfTimezone >= availStart &&
            appointmentHourInProfTimezone < availEnd;

        if (!withinHours) {
            const professionalTimeString = formatTz(
                appointmentInProfTimezone,
                'h:mm a zzz',
                { timeZone: professionalTimezone }
            );
            return NextResponse.json(
                {
                    error: `This time (${professionalTimeString}) is outside ${professionalProfile.full_name}'s working hours (${availability.start_time} - ${availability.end_time} ${professionalTimezone})`
                },
                { status: 400 }
            );
        }

        // Robust overlap check:
        // Overlap iff existing.start < requestedEnd AND existing.end > requestedStart
        const { data: conflicts, error: conflictError } = await supabase
            .from('appointments')
            .select('id')
            .eq('professional_id', professionalId)
            .eq('status', 'confirmed')
            .lt('start_time', endTime) // existing.start < requestedEnd
            .gt('end_time', startTime); // existing.end   > requestedStart

        if (conflictError) {
            console.error('Conflict check error:', conflictError);
            return NextResponse.json({ error: 'Error checking appointment availability' }, { status: 500 });
        }

        if (conflicts && conflicts.length > 0) {
            return NextResponse.json(
                { error: 'This time slot conflicts with an existing appointment' },
                { status: 409 }
            );
        }

        // First consult pricing
        const { count: appointmentCount, error: countError } = await supabase
            .from('appointments')
            .select('*', { count: 'exact', head: true })
            .eq('client_id', clientProfile.id)
            .eq('professional_id', professionalId);

        if (countError) {
            console.error('Count error:', countError);
            return NextResponse.json({ error: 'Error checking appointment history' }, { status: 500 });
        }

        const isFirstConsult = (appointmentCount || 0) === 0;
        const price = isFirstConsult ? 0 : (professionalProfile.hourly_rate || 0);

        // Insert appointment (store UTC)
        const { data: newAppointment, error: insertError } = await supabase
            .from('appointments')
            .insert({
                client_id: clientProfile.id,
                professional_id: professionalId,
                start_time: startTime, // UTC ISO from client
                end_time: endTime,     // UTC ISO from client
                price,
                is_first_consult: isFirstConsult,
                status: 'confirmed',
                is_request_handled: false,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            })
            .select()
            .single();

        if (insertError) {
            console.error('Insert error:', insertError);

            // Unique index collision path (if you add one)
            if (insertError.code === '23505') {
                return NextResponse.json(
                    { error: 'This time slot has just been booked by someone else' },
                    { status: 409 }
                );
            }

            // Optional: handle custom constraint messages
            if (insertError.message?.includes('conflicts with existing booking')) {
                return NextResponse.json(
                    { error: 'This time slot conflicts with an existing appointment' },
                    { status: 409 }
                );
            }
            if (insertError.message?.includes('not available')) {
                return NextResponse.json(
                    { error: 'Professional is not available at this time' },
                    { status: 400 }
                );
            }

            return NextResponse.json(
                { error: 'Failed to create appointment: ' + insertError.message },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            appointment: newAppointment,
            isFirstConsult,
        });
    } catch (error) {
        console.error('Booking API error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
