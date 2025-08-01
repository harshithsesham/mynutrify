// app/api/debug-consultations/route.ts
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET() {
    const supabase = createRouteHandlerClient({ cookies });

    try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        console.log('Current user:', user?.id);

        // Test 1: Get all consultation requests without any filters
        const { data: allConsultations, error: allError } = await supabase
            .from('consultation_requests')
            .select('*');

        console.log('All consultations query result:', {
            count: allConsultations?.length,
            error: allError,
            data: allConsultations
        });

        // Test 2: Get only scheduled consultations
        const { data: scheduledOnly, error: scheduledError } = await supabase
            .from('consultation_requests')
            .select('*')
            .eq('status', 'scheduled');

        console.log('Scheduled only query result:', {
            count: scheduledOnly?.length,
            error: scheduledError,
            data: scheduledOnly
        });

        // Test 3: Get scheduled consultations without assigned nutritionist
        const { data: unassignedScheduled, error: unassignedError } = await supabase
            .from('consultation_requests')
            .select('*')
            .eq('status', 'scheduled')
            .is('assigned_nutritionist_id', null);

        console.log('Unassigned scheduled query result:', {
            count: unassignedScheduled?.length,
            error: unassignedError,
            data: unassignedScheduled
        });

        // Test 4: Get with multiple statuses
        const { data: multiStatus, error: multiError } = await supabase
            .from('consultation_requests')
            .select('*')
            .in('status', ['completed', 'scheduled'])
            .is('assigned_nutritionist_id', null);

        console.log('Multi-status query result:', {
            count: multiStatus?.length,
            error: multiError,
            data: multiStatus
        });

        // Test 5: Check RLS policies
        const { data: rlsCheck, error: rlsError } = await supabase
            .rpc('current_setting', { setting: 'row_security' });

        console.log('RLS enabled:', rlsCheck);

        return NextResponse.json({
            success: true,
            results: {
                all: {
                    count: allConsultations?.length || 0,
                    error: allError?.message
                },
                scheduledOnly: {
                    count: scheduledOnly?.length || 0,
                    error: scheduledError?.message
                },
                unassignedScheduled: {
                    count: unassignedScheduled?.length || 0,
                    error: unassignedError?.message
                },
                multiStatus: {
                    count: multiStatus?.length || 0,
                    error: multiError?.message
                },
                rlsEnabled: rlsCheck
            },
            user: user?.id
        });

    } catch (error) {
        console.error('Debug API error:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}