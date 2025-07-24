// app/api/book-appointment/route.ts
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { addHours, isAfter, parseISO, set } from 'date-fns';

export async function POST(req: NextRequest) {
    const supabase = createRouteHandlerClient({ cookies });

    try {
        const {
            professionalId,
            selectedDate,
            selectedSlot
        } = await req.json();

        // Validate input
        if (!professionalId || !selectedDate || !selectedSlot) {
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

        // Parse appointment time
        const appointmentDate = new Date(selectedDate);
        const [hour] = selectedSlot.split(':').map(Number);
        const appointmentStartTime = set(appointmentDate, {
            hours: hour,
            minutes: 0,
            seconds: 0,
            milliseconds: 0
        });
        const appointmentEndTime = set(appointmentStartTime, { hours: hour + 1 });

        // Validation 1: Check if appointment is at least 1 hour in future
        const minBookableTime = addHours(new Date(), 1);
        if (!isAfter(appointmentStartTime, minBookableTime)) {
            return NextResponse.json({
                error: 'Appointments must be booked at least 1 hour in advance'
            }, { status: 400 });
        }

        // Validation 2: Check professional availability
        const dayOfWeek = appointmentDate.getDay();
        const { data: availability, error: availError } = await supabase
            .from('availability')
            .select('start_time, end_time')
            .eq('professional_id', professionalId)
            .eq('day_of_week', dayOfWeek)
            .single();

        if (availError || !availability) {
            return NextResponse.json({
                error: 'Professional not available on this day'
            }, { status: 400 });
        }

        const availStart = parseInt(availability.start_time.split(':')[0]);
        const availEnd = parseInt(availability.end_time.split(':')[0]);

        if (hour < availStart || hour >= availEnd) {
            return NextResponse.json({
                error: 'Selected time slot is outside professional availability'
            }, { status: 400 });
        }

        // Validation 3: Double-booking prevention
        const { data: existingAppointment, error: conflictError } = await supabase
            .from('appointments')
            .select('id')
            .eq('professional_id', professionalId)
            .eq('status', 'confirmed')
            .gte('start_time', appointmentStartTime.toISOString())
            .lt('start_time', appointmentEndTime.toISOString())
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

        // Get professional details for pricing
        const { data: professional, error: profError } = await supabase
            .from('profiles')
            .select('hourly_rate')
            .eq('id', professionalId)
            .single();

        if (profError || !professional) {
            return NextResponse.json({
                error: 'Professional not found'
            }, { status: 404 });
        }

        const price = isFirstConsult ? 0 : (professional.hourly_rate || 0);

        // Create appointment with database-level validation
        const { data: newAppointment, error: insertError } = await supabase
            .from('appointments')
            .insert({
                client_id: clientProfile.id,
                professional_id: professionalId,
                start_time: appointmentStartTime.toISOString(),
                end_time: appointmentEndTime.toISOString(),
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

            // Check if it's a unique constraint violation (double booking)
            if (insertError.code === '23505') {
                return NextResponse.json({
                    error: 'This time slot has just been booked by someone else'
                }, { status: 409 });
            }

            // Check if it's a trigger error (overlap or availability)
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
