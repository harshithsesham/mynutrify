// app/api/create-meeting/route.ts
import { google } from 'googleapis';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    const supabase = createRouteHandlerClient({ cookies });
    const { appointmentId, professionalProfileId, clientEmail, startTime, endTime } = await req.json();

    if (!appointmentId || !professionalProfileId || !clientEmail || !startTime || !endTime) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    try {
        // 1. Fetch the professional's details, including their name, role, and refresh token
        const { data: professionalProfile, error: profileError } = await supabase
            .from('profiles')
            .select('full_name, role, google_refresh_token')
            .eq('id', professionalProfileId)
            .single();

        if (profileError || !professionalProfile?.google_refresh_token) {
            throw new Error('Could not find Google credentials for this professional. Please connect your Google Calendar in settings.');
        }

        // 2. Fetch the client's name
        const { data: { user } } = await supabase.auth.getUser();
        const { data: clientProfile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('user_id', user?.id)
            .single();

        const clientName = clientProfile?.full_name || clientEmail.split('@')[0];

        // 3. Configure OAuth2 client
        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            process.env.GOOGLE_REDIRECT_URI
        );
        oauth2Client.setCredentials({ refresh_token: professionalProfile.google_refresh_token });

        const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
        const requestId = `nutrify-${appointmentId}-${Date.now()}`;

        // 4. Format professional role
        const roleTitle = professionalProfile.role === 'nutritionist' ? 'Nutritionist' : 'Trainer';

        // 5. Insert the event with improved title and description
        const insertResp = await calendar.events.insert({
            calendarId: 'primary',
            conferenceDataVersion: 1,
            requestBody: {
                summary: `Consultation: ${roleTitle} ${professionalProfile.full_name} & Client ${clientName}`,
                description: `${roleTitle === 'Nutritionist' ? 'Nutrition' : 'Training'} consultation session.\n\nProfessional: ${professionalProfile.full_name} (${roleTitle})\nClient: ${clientName}\n\nBooked via Nutrify platform.`,
                start: {
                    dateTime: startTime,
                },
                end: {
                    dateTime: endTime,
                },
                attendees: [{ email: clientEmail }],
                conferenceData: {
                    createRequest: {
                        requestId,
                        conferenceSolutionKey: { type: 'hangoutsMeet' }
                    }
                }
            }
        });

        let ev = insertResp.data;
        let attempt = 0;
        while (ev.conferenceData?.createRequest?.status?.statusCode === 'pending' && attempt < 5) {
            await new Promise((r) => setTimeout(r, 1500));
            const fresh = await calendar.events.get({ calendarId: 'primary', eventId: ev.id! });
            ev = fresh.data;
            attempt++;
        }

        const meetingLink = ev.hangoutLink;
        if (!meetingLink) {
            throw new Error('Failed to retrieve the Google Meet link.');
        }

        // 4. Persist the final meeting link in Supabase
        const { error: updateError } = await supabase
            .from('appointments')
            .update({ meeting_link: meetingLink })
            .eq('id', appointmentId);

        if (updateError) throw updateError;

        return NextResponse.json({ meetingLink });

    } catch (err) {
        const error = err as Error;
        console.error('Error creating Google Meet link:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to create meeting link.' },
            { status: 500 }
        );
    }
}