// app/(auth)/callback/route.ts

import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Handles the OAuth callback from Supabase.
 * Exchanges the auth code for a session,
 * back-fills consultation requests with client_id,
 * and redirects the user to the intended page.
 */
export async function GET(request: NextRequest) {
    // 1) Parse incoming URL and parameters
    const url   = new URL(request.url);
    const code  = url.searchParams.get('code');
    const next  = url.searchParams.get('next') || '/dashboard';
    const error = url.searchParams.get('error_description') || url.searchParams.get('error');

    // 2) If there was an OAuth error, send back to login with the message
    if (error) {
        return NextResponse.redirect(`/login?error=${encodeURIComponent(error)}`);
    }

    // 3) If no code present, cannot proceed
    if (!code) {
        return NextResponse.redirect('/login?error=Missing%20code');
    }

    // 4) Create a Supabase client bound to the server cookies
    const supabase = createRouteHandlerClient({ cookies });

    // 5) Exchange the authorization code for a session
    const { data: sessionData, error: exchangeError } =
        await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError || !sessionData.session) {
        const msg = exchangeError?.message || 'Session exchange failed';
        return NextResponse.redirect(`/login?error=${encodeURIComponent(msg)}`);
    }

    // 6) Extract the authenticated user
    const user = sessionData.session.user;

    if (user) {
        try {
            // 7) Look up this user's profile
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('id')
                .eq('user_id', user.id)
                .single();

            // 8) If a profile exists, back-fill any pending consultation_requests
            if (profile && profile.id) {
                await supabase
                    .from('consultation_requests')
                    .update({ client_id: profile.id })
                    .eq('email', user.email)
                    .is('client_id', null);
            }
        } catch (err) {
            console.error('Error linking consultation requests:', err);
            // We won't block the redirect if this back-fill fails
        }
    }

    // 9) Finally redirect the user to the next page (or dashboard)
    return NextResponse.redirect(next);
}

// End of file
