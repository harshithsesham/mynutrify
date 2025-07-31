// app/api/nutritionist/schedule-session/route.ts
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    const supabase = createRouteHandlerClient({ cookies });

    try {
        const { clientId, startTime, duration, sessionType, sessionNotes } = await req.json();

        // Get nutritionist profile
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json(
                { error: 'Unauthorized - no user found' },
                { status: 401 }
            );
        }

        const { data: nutritionistProfile } = await supabase
            .from('profiles')
            .select('id, full_name')
            .eq('user_id', user.id)
            .single();

        if (!nutritionistProfile) {
            return NextResponse.json(
                { error: 'Nutritionist profile not found' },
                { status: 404 }
            );
        }

        // Calculate end time
        const endTime = new Date(startTime);
        endTime.setMinutes(endTime.getMinutes() + duration);

        // Create appointment
        const { data: appointment, error } = await supabase
            .from('appointments')
            .insert({
                client_id: clientId,
                professional_id: nutritionistProfile.id,
                start_time: startTime,
                end_time: endTime.toISOString(),
                status: 'confirmed',
                session_type: sessionType,
                session_notes: sessionNotes,
                scheduled_by: 'nutritionist',
                price: 0, // You can calculate based on nutritionist's rate
                is_first_consult: false
            })
            .select()
            .single();

        if (error) throw error;

        // Get client email for notifications
        const { data: clientProfile } = await supabase
            .from('profiles')
            .select('user_id, full_name')
            .eq('id', clientId)
            .single();

        // TODO: Create Google Meet link
        // TODO: Send notification email to client

        return NextResponse.json({ success: true, appointment });
    } catch (error) {
        console.error('Error scheduling session:', error);
        return NextResponse.json(
            { error: 'Failed to schedule session' },
            { status: 500 }
        );
    }
}