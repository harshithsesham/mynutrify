// 🔧 FIX 1: Update the schedule-consultation API to create proper Google Meet links

// Update: frontend/src/app/api/health-coach/schedule-consultation/route.ts
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
            .select('id, full_name')
            .eq('user_id', user.id)
            .single();

        if (!profile) {
            return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
        }

        const { data: healthCoach } = await supabase
            .from('health_coaches')
            .select('id')
            .eq('profile_id', profile.id)
            .single();

        if (!healthCoach) {
            return NextResponse.json({ error: 'Not a health coach' }, { status: 403 });
        }

        // Get consultation request details
        const { data: consultationRequest } = await supabase
            .from('consultation_requests')
            .select('client_name, client_email')
            .eq('id', requestId)
            .single();

        // Create appointment record first
        const startDateTime = `${scheduledDate}T${scheduledTime}:00`;
        const endDateTime = new Date(new Date(startDateTime).getTime() + 60 * 60 * 1000).toISOString(); // 1 hour later

        const { data: appointment, error: appointmentError } = await supabase
            .from('appointments')
            .insert({
                professional_id: profile.id,
                client_email: consultationRequest?.client_email || '',
                start_time: startDateTime,
                end_time: endDateTime,
                status: 'confirmed',
                session_type: 'consultation',
                meeting_link: null, // Will be updated after Google Meet creation
                session_notes: notes,
                price: 0,
                is_first_consult: true
            })
            .select()
            .single();

        if (appointmentError) {
            console.error('Error creating appointment:', appointmentError);
        }

        let meetingLink = null;

        // Create Google Meet link if meeting type is video and we have Google integration
        if (meetingType === 'video' && appointment) {
            try {
                const meetingResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/create-meeting`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        appointmentId: appointment.id,
                        professionalProfileId: profile.id,
                        clientEmail: consultationRequest?.client_email || '',
                        startTime: startDateTime,
                        endTime: endDateTime,
                    }),
                });

                if (meetingResponse.ok) {
                    const { meetingLink: generatedLink } = await meetingResponse.json();
                    meetingLink = generatedLink;
                } else {
                    console.error('Failed to create Google Meet link');
                    meetingLink = 'Google Meet link creation failed - will be sent separately';
                }
            } catch (error) {
                console.error('Error creating meeting link:', error);
                meetingLink = 'Google Meet link creation failed - will be sent separately';
            }
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
                meeting_link: meetingLink
            })
            .eq('id', requestId)
            .select()
            .single();

        if (error) throw error;

        // Update appointment with meeting link
        if (appointment && meetingLink) {
            await supabase
                .from('appointments')
                .update({ meeting_link: meetingLink })
                .eq('id', appointment.id);
        }

        return NextResponse.json({
            success: true,
            consultation: updatedRequest,
            appointment: appointment,
            meetingLink: meetingLink
        });
    } catch (error) {
        console.error('Error scheduling consultation:', error);
        return NextResponse.json(
            { error: 'Failed to schedule consultation' },
            { status: 500 }
        );
    }
}