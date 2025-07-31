// app/api/consultation-request/route.ts
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    const supabase = createRouteHandlerClient({ cookies });
    const data = await req.json();

    try {
        const { data: request, error } = await supabase
            .from('consultation_requests')
            .insert({
                full_name: data.fullName,
                email: data.email,
                phone: data.phone,
                age: parseInt(data.age),
                gender: data.gender,
                health_goals: data.healthGoals,
                current_challenges: data.currentChallenges,
                preferred_days: data.preferredDays,
                preferred_time_slots: data.preferredTimeSlots,
                additional_info: data.additionalInfo
            })
            .select()
            .single();

        if (error) throw error;

        // TODO: Send notification email to health coaches
        // TODO: Send confirmation email to client

        return NextResponse.json({ success: true, requestId: request.id });
    } catch (error) {
        console.error('Error creating consultation request:', error);
        return NextResponse.json(
            { error: 'Failed to submit consultation request' },
            { status: 500 }
        );
    }
}