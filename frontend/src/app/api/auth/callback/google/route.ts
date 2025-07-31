// app/api/auth/callback/google/route.ts
import { google } from 'googleapis';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
    const supabase = createRouteHandlerClient({ cookies });
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const error = url.searchParams.get('error');

    console.log('Google callback received:', { code: !!code, error });

    // Handle user denial
    if (error) {
        console.log('User denied access:', error);
        return NextResponse.redirect(new URL('/dashboard/settings/profile?error=access_denied', req.url));
    }

    if (!code) {
        console.log('No authorization code received');
        return NextResponse.redirect(new URL('/dashboard/settings/profile?error=no_code', req.url));
    }

    try {
        // Check if user is authenticated
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            console.log('User not authenticated:', authError);
            // Redirect to login instead of throwing error
            return NextResponse.redirect(new URL('/login?error=not_authenticated&message=Please log in first', req.url));
        }

        console.log('User authenticated:', user.id);

        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            process.env.GOOGLE_REDIRECT_URI
        );

        console.log('OAuth client configured');

        // Exchange the authorization code for tokens
        const { tokens } = await oauth2Client.getToken(code);

        // Debug token response
        console.log('Full token response:', {
            access_token: tokens.access_token ? 'PRESENT' : 'MISSING',
            refresh_token: tokens.refresh_token ? 'PRESENT' : 'MISSING',
            scope: tokens.scope,
            token_type: tokens.token_type,
            expiry_date: tokens.expiry_date
        });

        // Log raw tokens for debugging (remove in production)
        console.log('Raw tokens:', JSON.stringify(tokens, null, 2));

        const { refresh_token, access_token } = tokens;

        if (!refresh_token) {
            console.log('No refresh token received - user may not have granted offline access');
            // Still save access token if available
            if (!access_token) {
                throw new Error('No tokens received from Google');
            }
        }

        // Save tokens to user's profile (only save refresh token since access token column doesn't exist)
        const updateData: {
            google_refresh_token?: string;
        } = {};

        if (refresh_token) {
            updateData.google_refresh_token = refresh_token;
            console.log('Saving refresh token to database');
        } else {
            console.log('No refresh token to save - this may cause issues with calendar integration');
        }

        if (Object.keys(updateData).length === 0) {
            throw new Error('GOOGLE_NO_TOKENS: No tokens available to save');
        }

        console.log('Updating user profile with tokens');

        const { error: updateError } = await supabase
            .from('profiles')
            .update(updateData)
            .eq('user_id', user.id);

        if (updateError) {
            console.error('Database update error:', updateError);
            throw updateError;
        }

        console.log('Google Calendar connected successfully');

        // Redirect with success message
        return NextResponse.redirect(new URL('/dashboard/settings/profile?success=calendar_connected', req.url));

    } catch (error) {
        console.error('Error during Google OAuth callback:', error);

        // Provide more specific error handling
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const encodedError = encodeURIComponent(errorMessage);

        return NextResponse.redirect(
            new URL(`/dashboard/settings/profile?error=calendar_failed&message=${encodedError}`, req.url)
        );
    }
}