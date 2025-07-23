// app/api/auth/google/route.ts
import { google } from 'googleapis';
import { NextResponse } from 'next/server';

export async function GET() {
    const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI // e.g., http://localhost:3000/api/auth/callback/google
    );

    // Define the scopes we need to access
    const scopes = [
        'https://www.googleapis.com/auth/calendar.events'
    ];

    // Generate the URL that will prompt the user for consent
    const authorizationUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline', // 'offline' is crucial for getting a refresh token
        scope: scopes,
        include_granted_scopes: true
    });

    // Redirect the user to Google's OAuth consent screen
    return NextResponse.redirect(authorizationUrl);
}
