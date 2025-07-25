// app/(auth)/callback/route.ts
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
    const requestUrl = new URL(request.url);
    const code = requestUrl.searchParams.get('code');
    const next = requestUrl.searchParams.get('next');
    const error = requestUrl.searchParams.get('error');
    const error_description = requestUrl.searchParams.get('error_description');

    console.log('Auth callback:', { code: !!code, next, error, error_description });

    // Handle auth errors
    if (error) {
        console.error('Auth callback error:', error, error_description);
        return NextResponse.redirect(
            new URL(`/login?error=${encodeURIComponent(error_description || error)}`, requestUrl.origin)
        );
    }

    if (code) {
        const supabase = createRouteHandlerClient({ cookies });

        try {
            // Exchange the code for a session
            const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

            if (exchangeError) {
                console.error('Session exchange error:', exchangeError);
                return NextResponse.redirect(
                    new URL(`/login?error=${encodeURIComponent(exchangeError.message)}`, requestUrl.origin)
                );
            }

            console.log('Session created successfully for user:', data.user?.id);

            // Check if user has a profile and role
            if (data.user) {
                const { data: profile, error: profileError } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('user_id', data.user.id)
                    .single();

                if (profileError) {
                    console.log('No profile found, will be created in role selection');
                }

                // If no profile or no role, send to role selection
                if (!profile || !profile.role) {
                    console.log('Redirecting to role selection');
                    return NextResponse.redirect(new URL('/role-selection', requestUrl.origin));
                }

                console.log('User has role:', profile.role, 'redirecting to dashboard');
            }
        } catch (error) {
            console.error('Callback processing error:', error);
            return NextResponse.redirect(
                new URL('/login?error=Authentication failed', requestUrl.origin)
            );
        }
    }

    // Redirect to the next URL or dashboard
    const redirectUrl = next || '/dashboard';
    console.log('Final redirect to:', redirectUrl);
    return NextResponse.redirect(new URL(redirectUrl, requestUrl.origin));
}