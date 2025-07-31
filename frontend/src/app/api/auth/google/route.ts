// app/api/auth/google/route.ts
import { google } from 'googleapis';
import { NextResponse } from 'next/server';

export async function GET() {
    const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
    );

    // Define the scopes we need to access
    const scopes = [
        'https://www.googleapis.com/auth/calendar.events'
    ];

    // Generate the URL that will prompt the user for consent
    const authorizationUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline', // This is crucial for refresh token
        scope: scopes,
        include_granted_scopes: true,
        prompt: 'consent' // Forces consent screen every time - ensures refresh token
        // Removed approval_prompt as it conflicts with prompt parameter
    });

    console.log('Generated auth URL:', authorizationUrl);

    // Redirect the user to Google's OAuth consent screen
    return NextResponse.redirect(authorizationUrl);
}