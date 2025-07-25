// =============================================================================
// middleware.ts (Updated version for your root directory)
// =============================================================================

import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
    const res = NextResponse.next();
    // Create a Supabase client that can be used in Server Components
    const supabase = createMiddlewareClient({ req, res });

    // Get the session from the cookies
    const { data: { session } } = await supabase.auth.getSession();

    // Define which routes are protected and require a logged-in user
    const protectedRoutes = [
        '/dashboard',
        '/settings',
        '/my-appointments',
        '/find-a-pro',
        '/professionals',
        '/auth/role-selection'  // Updated path
    ];

    const isProtectedRoute = protectedRoutes.some(path => req.nextUrl.pathname.startsWith(path));

    // If the user is not signed in and is trying to access a protected route,
    // redirect them to the login page.
    if (!session && isProtectedRoute) {
        return NextResponse.redirect(new URL('/auth/login', req.url));
    }

    // If the user is signed in and tries to access the login page,
    // redirect them to their dashboard (but first check if they need role selection)
    if (session && (req.nextUrl.pathname === '/auth/login' || req.nextUrl.pathname === '/login')) {
        try {
            // Check if user has a role set
            const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('user_id', session.user.id)
                .single();

            // If no role is set, send to role selection
            if (!profile || !profile.role) {
                return NextResponse.redirect(new URL('/auth/role-selection', req.url));
            }

            // If role is set, send to dashboard
            return NextResponse.redirect(new URL('/dashboard', req.url));
        } catch (error) {
            // If there's an error checking the profile, send to role selection to be safe
            console.error('Error checking user profile:', error);
            return NextResponse.redirect(new URL('/auth/role-selection', req.url));
        }
    }

    // If user is signed in but accessing role-selection and already has a role, redirect to dashboard
    if (session && req.nextUrl.pathname === '/auth/role-selection') {
        try {
            const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('user_id', session.user.id)
                .single();

            // If user already has a role, redirect to dashboard
            if (profile?.role) {
                return NextResponse.redirect(new URL('/dashboard', req.url));
            }
        } catch (error) {
            // If error checking profile, let them access role selection
            console.error('Error checking user profile for role selection:', error);
        }
    }

    // Handle legacy /role-selection route (redirect to new location)
    if (req.nextUrl.pathname === '/role-selection') {
        return NextResponse.redirect(new URL('/auth/role-selection', req.url));
    }

    // Handle legacy /login route (redirect to new location)
    if (req.nextUrl.pathname === '/login') {
        return NextResponse.redirect(new URL('/auth/login', req.url));
    }

    return res;
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        '/((?!api|_next/static|_next/image|favicon.ico).*)',
    ],
};