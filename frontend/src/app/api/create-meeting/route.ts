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
        // 1. Get the professional's refresh token from your database
        const { data: professionalProfile, error: profileError } = await supabase
            .from('profiles')
            .select('google_refresh_token')
            .eq('id', professionalProfileId)
            .single();

        if (profileError || !professionalProfile?.google_refresh_token) {
            throw new Error('Could not find Google credentials for this professional.');
        }

        // 2. Set up the Google OAuth client
        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            process.env.GOOGLE_REDIRECT_URI
        );

        // 3. Use the refresh token to get a new access token
        oauth2Client.setCredentials({
            refresh_token: professionalProfile.google_refresh_token,
        });

        const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

        // 4. Create a new event in the professional's Google Calendar
        const event = await calendar.events.insert({
            calendarId: 'primary',
            conferenceDataVersion: 1,
            requestBody: {
                summary: `Consultation with ${clientEmail}`,
                description: `Nutrition consultation booked via Nutrify.`,
                start: {
                    dateTime: startTime,
                    timeZone: 'Asia/Kolkata', // Or make this dynamic
                },
                end: {
                    dateTime: endTime,
                    timeZone: 'Asia/Kolkata',
                },
                conferenceData: {
                    createRequest: {
                        requestId: `nutrify-booking-${appointmentId}`,
                        conferenceSolutionKey: {
                            type: 'hangoutsMeet',
                        },
                    },
                },
                attendees: [
                    { email: clientEmail },
                ],
            },
        });

        const meetingLink = event.data.hangoutLink;

        if (!meetingLink) {
            throw new Error('Failed to create Google Meet link.');
        }

        // 5. Update the appointment in your database with the real meeting link
        const { error: updateError } = await supabase
            .from('appointments')
            .update({ meeting_link: meetingLink })
            .eq('id', appointmentId);

        if (updateError) {
            throw updateError;
        }

        return NextResponse.json({ meetingLink });

    } catch (error) {
        console.error('Error creating Google Meet link:', error);
        return NextResponse.json({ error: 'Failed to create meeting link.' }, { status: 500 });
    }
}
