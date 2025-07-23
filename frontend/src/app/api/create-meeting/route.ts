// app/api/create-meeting/route.ts
import { google } from 'googleapis';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    const supabase = createRouteHandlerClient({ cookies });
    const { appointmentId, professionalProfileId, clientEmail, startTime, endTime } = await req.json();

    // 1. Validate payload
    if (!appointmentId || !professionalProfileId || !clientEmail || !startTime || !endTime) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    try {
        // 2. Fetch the professional's stored Google refresh token
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('google_refresh_token')
            .eq('id', professionalProfileId)
            .single();

        if (profileError || !profile?.google_refresh_token) {
            throw new Error('Could not find Google credentials for this professional.');
        }

        // 3. Configure OAuth2 client
        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            process.env.GOOGLE_REDIRECT_URI
        );
        oauth2Client.setCredentials({ refresh_token: profile.google_refresh_token });

        const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

        // 4. Build a unique requestId
        const requestId = `nutrify-${appointmentId}-${Date.now()}`;

        // 5. Insert the event
        const eventResponse = await calendar.events.insert({
            calendarId: 'primary',
            conferenceDataVersion: 1,
            requestBody: {
                summary: `Consultation with ${clientEmail}`,
                description: `Nutrition consultation booked via Nutrify.`,
                start: { dateTime: startTime, timeZone: 'Asia/Kolkata' },
                end:   { dateTime: endTime,   timeZone: 'Asia/Kolkata' },
                attendees: [{ email: clientEmail }],
                conferenceData: {
                    createRequest: {
                        requestId,
                        conferenceSolutionKey: { type: 'hangoutsMeet' }
                    }
                }
            }
        });

        // This is the fix: The response object is accessed directly
        let event = eventResponse.data;

        // 6. Poll until the conference is created
        const maxAttempts = 5;
        let attempt = 0;
        while (
            event.conferenceData?.createRequest?.status?.statusCode === 'pending' &&
            attempt < maxAttempts
            ) {
            await new Promise((r) => setTimeout(r, 1500)); // wait 1.5s
            const freshEventResponse = await calendar.events.get({
                calendarId: 'primary',
                eventId: event.id!,
            });
            event = freshEventResponse.data;
            attempt++;
        }

        // 7. Extract the real Meet link
        const meetingLink = event.hangoutLink;

        if (!meetingLink) {
            throw new Error('Failed to retrieve the Google Meet link.');
        }

        // 8. Persist the final meeting link in Supabase
        const { error: updateError } = await supabase
            .from('appointments')
            .update({ meeting_link: meetingLink })
            .eq('id', appointmentId);

        if (updateError) {
            throw updateError;
        }

        // 9. Return to client
        return NextResponse.json({ meetingLink });

    } catch (err: any) {
        console.error('Error creating Google Meet link:', err);
        return NextResponse.json(
            { error: err.message || 'Failed to create meeting link.' },
            { status: 500 }
        );
    }
}
