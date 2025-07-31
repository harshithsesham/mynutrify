// 1. Fix CORS in your API route
// app/api/auth/callback/google/route.ts - Add CORS headers

import { google } from 'googleapis';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
    // Add CORS headers
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    const supabase = createRouteHandlerClient({ cookies });
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const error = url.searchParams.get('error');

    console.log('Google callback received:', { code: !!code, error });

    // Handle user denial
    if (error) {
        console.log('User denied access:', error);
        const redirectResponse = NextResponse.redirect(new URL('/dashboard/settings/profile?error=access_denied', req.url));
        // Add CORS headers to redirect
        Object.entries(corsHeaders).forEach(([key, value]) => {
            redirectResponse.headers.set(key, value);
        });
        return redirectResponse;
    }

    if (!code) {
        console.log('No authorization code received');
        const redirectResponse = NextResponse.redirect(new URL('/dashboard/settings/profile?error=no_code', req.url));
        Object.entries(corsHeaders).forEach(([key, value]) => {
            redirectResponse.headers.set(key, value);
        });
        return redirectResponse;
    }

    try {
        // Check if user is authenticated
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            console.log('User not authenticated:', authError);
            const redirectResponse = NextResponse.redirect(new URL('/login?error=not_authenticated&message=Please log in first', req.url));
            Object.entries(corsHeaders).forEach(([key, value]) => {
                redirectResponse.headers.set(key, value);
            });
            return redirectResponse;
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

        const { refresh_token, access_token } = tokens;

        if (!refresh_token) {
            console.log('No refresh token received - user may not have granted offline access');
            if (!access_token) {
                throw new Error('No tokens received from Google');
            }
        }

        // Save tokens to user's profile
        const updateData: {
            google_refresh_token?: string;
            google_access_token?: string;
        } = {};

        if (refresh_token) {
            updateData.google_refresh_token = refresh_token;
        }
        if (access_token) {
            updateData.google_access_token = access_token;
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

        // Redirect with success message and CORS headers
        const redirectResponse = NextResponse.redirect(new URL('/dashboard/settings/profile?success=calendar_connected&refresh=true', req.url));
        Object.entries(corsHeaders).forEach(([key, value]) => {
            redirectResponse.headers.set(key, value);
        });
        return redirectResponse;

    } catch (error) {
        console.error('Error during Google OAuth callback:', error);

        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const encodedError = encodeURIComponent(errorMessage);

        const redirectResponse = NextResponse.redirect(
            new URL(`/dashboard/settings/profile?error=calendar_failed&message=${encodedError}`, req.url)
        );
        Object.entries(corsHeaders).forEach(([key, value]) => {
            redirectResponse.headers.set(key, value);
        });
        return redirectResponse;
    }
}

// Handle OPTIONS request for CORS
export async function OPTIONS() {
    return new NextResponse(null, {
        status: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
    });
}