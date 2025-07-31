// app/api/health-coach/schedule-consultation/route.ts
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    const supabase = createRouteHandlerClient({ cookies });
    const { requestId, scheduledDate, scheduledTime, meetingType, notes } = await req.json();

    try {
        // Get current user (health coach)
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get health coach profile
        const { data: profile } = await supabase
            .from('profiles')
            .select('id')
            .eq('user_id', user.id)
            .single();

        if (!profile) {
            return NextResponse.json(
                { error: 'Profile not found' },
                { status: 404 }
            );
        }

        const { data: healthCoach } = await supabase
            .from('health_coaches')
            .select('id')
            .eq('profile_id', profile.id)
            .single();

        if (!healthCoach) {
            return NextResponse.json({ error: 'Not a health coach' }, { status: 403 });
        }

        // Update consultation request
        const { data: updatedRequest, error } = await supabase
            .from('consultation_requests')
            .update({
                status: 'scheduled',
                scheduled_date: scheduledDate,
                scheduled_time: scheduledTime,
                scheduled_by: healthCoach.id,
                meeting_type: meetingType,
                pre_consultation_notes: notes,
                meeting_link: meetingType === 'video' ? 'Google Meet link will be generated' : null
            })
            .eq('id', requestId)
            .select()
            .single();

        if (error) throw error;

        // TODO: Send confirmation email to client with meeting details
        // TODO: Create calendar event if video call

        return NextResponse.json({ success: true, consultation: updatedRequest });
    } catch (error) {
        console.error('Error scheduling consultation:', error);
        return NextResponse.json(
            { error: 'Failed to schedule consultation' },
            { status: 500 }
        );
    }
}