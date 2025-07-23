// app/api/auth/callback/google/route.ts
import { google } from 'googleapis';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
    const supabase = createRouteHandlerClient({ cookies });
    const url = new URL(req.url);
    const code = url.searchParams.get('code');

    if (!code) {
        return NextResponse.json({ error: 'Missing authorization code' }, { status: 400 });
    }

    try {
        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            process.env.GOOGLE_REDIRECT_URI
        );

        // Exchange the authorization code for tokens
        const { tokens } = await oauth2Client.getToken(code);
        const { refresh_token } = tokens;

        if (!refresh_token) {
            throw new Error('Refresh token not received from Google. Please ensure you are requesting offline access.');
        }

        // Get the currently logged-in user from Supabase
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            throw new Error('User not authenticated.');
        }

        // Securely save the refresh token to the user's profile
        const { error: updateError } = await supabase
            .from('profiles')
            .update({ google_refresh_token: refresh_token })
            .eq('user_id', user.id);

        if (updateError) {
            throw updateError;
        }

        // Redirect the user back to their settings page
        return NextResponse.redirect(new URL('/dashboard/settings/profile', req.url));

    } catch (error) {
        console.error('Error during Google OAuth callback:', error);
        return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
    }
}
