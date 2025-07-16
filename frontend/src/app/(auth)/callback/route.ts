// src/app/auth/callback/route.ts
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import type { NextRequest } from 'next/server';

// This is a crucial server-side route that exchanges the code
// from the email link for a user session.
export async function GET(request: NextRequest) {
    const requestUrl = new URL(request.url);
    const code = requestUrl.searchParams.get('code');
    const next = requestUrl.searchParams.get('next');

    if (code) {
        const supabase = createRouteHandlerClient({ cookies });
        // Exchange the code for a session
        await supabase.auth.exchangeCodeForSession(code);
    }

    // After the session is created, redirect the user to the page
    // they were trying to access, or to the role selection page.
    if (next) {
        return NextResponse.redirect(requestUrl.origin + next);
    }

    // Default redirect to the dashboard if 'next' is not provided
    return NextResponse.redirect(requestUrl.origin + '/dashboard');
}