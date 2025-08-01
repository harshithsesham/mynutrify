// app/api/test-consultation/route.ts
// Create this file to test database access
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
    try {
        const supabase = createRouteHandlerClient({ cookies });

        console.log('Testing database connection...');

        // Test 1: Check if table exists and is accessible
        const { data, error, count } = await supabase
            .from('consultation_requests')
            .select('*', { count: 'exact', head: true });

        if (error) {
            console.error('Database access error:', error);
            return NextResponse.json({
                success: false,
                error: 'Database access failed',
                details: error.message,
                code: error.code
            });
        }

        console.log('Database accessible, record count:', count);

        // Test 2: Check table structure
        const { data: sampleData, error: structureError } = await supabase
            .from('consultation_requests')
            .select('*')
            .limit(1);

        console.log('Sample data structure:', sampleData);

        return NextResponse.json({
            success: true,
            message: 'Database is accessible',
            recordCount: count,
            sampleStructure: sampleData?.[0] ? Object.keys(sampleData[0]) : 'No records'
        });

    } catch (error) {
        console.error('Test error:', error);
        return NextResponse.json({
            success: false,
            error: 'Test failed',
            details: error instanceof Error ? error.message : String(error)
        });
    }
}