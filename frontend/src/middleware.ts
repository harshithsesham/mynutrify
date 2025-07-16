// middleware.ts
// This file should be at the root of your `src` directory, or the project root if not using `src`.
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
    const protectedRoutes = ['/dashboard', '/settings', '/my-appointments', '/find-a-pro', '/professionals', '/role-selection'];
    const isProtectedRoute = protectedRoutes.some(path => req.nextUrl.pathname.startsWith(path));

    // If the user is not signed in and is trying to access a protected route,
    // redirect them to the login page.
    if (!session && isProtectedRoute) {
        return NextResponse.redirect(new URL('/login', req.url));
    }

    // If the user is signed in and tries to access the login page,
    // redirect them to their dashboard.
    if (session && req.nextUrl.pathname === '/login') {
        return NextResponse.redirect(new URL('/dashboard', req.url));
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
