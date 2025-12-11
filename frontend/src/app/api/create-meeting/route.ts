// frontend/src/app/api/create-meeting/route.ts
import { google } from 'googleapis';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    console.log('🎯 Create meeting API called');

    // FIX: Await cookies() for Next.js 15 compatibility
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore as any });

    try {
        const body = await req.json();
        const { appointmentId, professionalProfileId, clientEmail, startTime, endTime } = body;

        if (!appointmentId || !professionalProfileId || !clientEmail || !startTime || !endTime) {
            return NextResponse.json({
                error: 'Missing required fields'
            }, { status: 400 });
        }

        // 1. Fetch the professional's details
        const { data: professionalProfile, error: profileError } = await supabase
            .from('profiles')
            .select('full_name, role, google_refresh_token')
            .eq('id', professionalProfileId)
            .single();

        if (profileError || !professionalProfile?.google_refresh_token) {
            console.error('Professional profile error:', profileError);
            throw new Error('Could not find Google credentials for this professional.');
        }

        // 2. Get client name
        const clientName = clientEmail.split('@')[0];

        // 3. Configure OAuth2 client
        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            process.env.GOOGLE_REDIRECT_URI
        );

        oauth2Client.setCredentials({
            refresh_token: professionalProfile.google_refresh_token
        });

        const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
        const requestId = `Nutrishiksha-${appointmentId}-${Date.now()}`;
        const roleTitle = professionalProfile.role === 'nutritionist' ? 'Nutritionist' : 'Trainer';

        // 5. Create the calendar event
        const eventData = {
            summary: `Consultation: ${roleTitle} ${professionalProfile.full_name} & ${clientName}`,
            description: `${roleTitle} consultation session.\n\nProfessional: ${professionalProfile.full_name}\nClient: ${clientEmail}\n\nBooked via Nutrishiksha platform.`,
            start: {
                dateTime: startTime,
                timeZone: 'Asia/Kolkata' // FIX: Force IST timezone on Google Calendar
            },
            end: {
                dateTime: endTime,
                timeZone: 'Asia/Kolkata' // FIX: Force IST timezone on Google Calendar
            },
            attendees: [{ email: clientEmail }],
            conferenceData: {
                createRequest: {
                    requestId,
                    conferenceSolutionKey: { type: 'hangoutsMeet' }
                }
            },
            reminders: {
                useDefault: false,
                overrides: [
                    { method: 'email', minutes: 24 * 60 },
                    { method: 'popup', minutes: 30 }
                ]
            }
        };

        console.log('Creating calendar event...');

        const insertResp = await calendar.events.insert({
            calendarId: 'primary',
            conferenceDataVersion: 1,
            requestBody: eventData
        });

        console.log('Calendar event created:', insertResp.data.id);

        let ev = insertResp.data;
        let attempt = 0;

        // Wait for conference data to be created
        while (ev.conferenceData?.createRequest?.status?.statusCode === 'pending' && attempt < 5) {
            console.log(`Waiting for meeting link... attempt ${attempt + 1}`);
            await new Promise((r) => setTimeout(r, 1500));

            const fresh = await calendar.events.get({
                calendarId: 'primary',
                eventId: ev.id!
            });

            ev = fresh.data;
            attempt++;
        }

        const meetingLink = ev.hangoutLink;

        if (!meetingLink) {
            throw new Error('Failed to retrieve the Google Meet link.');
        }

        return NextResponse.json({
            meetingLink,
            success: true
        });

    } catch (err) {
        const error = err as Error;
        console.error('Error in create-meeting API:', error);

        return NextResponse.json(
            {
                error: error.message || 'Failed to create meeting link.'
            },
            { status: 500 }
        );
    }
}