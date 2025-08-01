// app/api/debug-consultation/route.ts
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
    console.log('🔍 Debug API called');

    try {
        // Check environment variables
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        console.log('Environment check:', {
            hasUrl: !!supabaseUrl,
            hasKey: !!supabaseKey,
            urlStart: supabaseUrl?.substring(0, 30) + '...',
            keyStart: supabaseKey?.substring(0, 20) + '...'
        });

        if (!supabaseUrl || !supabaseKey) {
            return NextResponse.json({
                success: false,
                error: 'Missing environment variables',
                debug: {
                    hasUrl: !!supabaseUrl,
                    hasKey: !!supabaseKey
                }
            }, { status: 500 });
        }

        // Create Supabase client
        const supabase = createClient(supabaseUrl, supabaseKey);
        console.log('✅ Supabase client created');

        // Test database connection
        const { data: testData, error: testError } = await supabase
            .from('consultation_requests')
            .select('id')
            .limit(1);

        console.log('Database test result:', {
            success: !testError,
            error: testError?.message,
            dataCount: testData?.length
        });

        if (testError) {
            return NextResponse.json({
                success: false,
                error: 'Database connection failed',
                debug: {
                    code: testError.code,
                    message: testError.message,
                    hint: testError.hint
                }
            }, { status: 500 });
        }

        // Test insert capability (with fake data)
        const testInsertData = {
            full_name: 'Debug Test User',
            email: `debug-${Date.now()}@test.com`,
            phone: '1234567890',
            age: 25,
            gender: 'test',
            health_goals: 'Debug test goals',
            status: 'pending'
        };

        console.log('🧪 Testing insert with:', testInsertData);

        const { data: insertResult, error: insertError } = await supabase
            .from('consultation_requests')
            .insert(testInsertData)
            .select()
            .single();

        if (insertError) {
            console.error('❌ Insert test failed:', insertError);
            return NextResponse.json({
                success: false,
                error: 'Insert test failed',
                debug: {
                    code: insertError.code,
                    message: insertError.message,
                    hint: insertError.hint,
                    details: insertError.details
                }
            }, { status: 500 });
        }

        console.log('✅ Insert test successful:', insertResult.id);

        // Clean up test data
        await supabase
            .from('consultation_requests')
            .delete()
            .eq('id', insertResult.id);

        return NextResponse.json({
            success: true,
            message: 'All tests passed!',
            debug: {
                environmentOk: true,
                databaseConnectionOk: true,
                insertTestOk: true,
                testRecordId: insertResult.id
            }
        });

    } catch (error) {
        console.error('💥 Debug API error:', error);
        return NextResponse.json({
            success: false,
            error: 'Debug test failed',
            debug: {
                message: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined
            }
        }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    console.log('🔥 Debug POST API called');

    try {
        const formData = await req.json();
        console.log('📝 Received test form data:', formData);

        // Use same logic as your main API
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseKey) {
            return NextResponse.json({
                success: false,
                error: 'Environment variables missing'
            }, { status: 500 });
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        // Minimal validation
        if (!formData.fullName || !formData.email || !formData.healthGoals) {
            return NextResponse.json({
                success: false,
                error: 'Missing required fields: fullName, email, healthGoals'
            }, { status: 400 });
        }

        // Prepare data exactly like your main API
        const insertData = {
            full_name: formData.fullName.toString().trim(),
            email: formData.email.toString().trim().toLowerCase(),
            phone: formData.phone?.toString().trim() || 'Not provided',
            age: parseInt(formData.age?.toString()) || 25,
            gender: formData.gender?.toString().trim() || 'not specified',
            health_goals: formData.healthGoals.toString().trim(),
            current_challenges: formData.currentChallenges ? formData.currentChallenges.toString().trim() : null,
            preferred_days: Array.isArray(formData.preferredDays) ? formData.preferredDays : [],
            preferred_time_slots: Array.isArray(formData.preferredTimeSlots) ? formData.preferredTimeSlots : [],
            additional_info: formData.additionalInfo ? formData.additionalInfo.toString().trim() : null,
            status: 'pending',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        console.log('💾 Attempting insert with debug API...');

        const { data: result, error: insertError } = await supabase
            .from('consultation_requests')
            .insert(insertData)
            .select()
            .single();

        if (insertError) {
            console.error('❌ Debug insert failed:', insertError);
            return NextResponse.json({
                success: false,
                error: 'Debug insert failed',
                debug: {
                    code: insertError.code,
                    message: insertError.message,
                    hint: insertError.hint,
                    insertData: insertData
                }
            }, { status: 500 });
        }

        console.log('✅ Debug insert successful:', result.id);

        return NextResponse.json({
            success: true,
            message: 'Debug form submission successful!',
            id: result.id,
            debug: {
                insertedData: insertData,
                resultId: result.id
            }
        });

    } catch (error) {
        console.error('💥 Debug POST error:', error);
        return NextResponse.json({
            success: false,
            error: 'Debug POST failed',
            debug: {
                message: error instanceof Error ? error.message : String(error)
            }
        }, { status: 500 });
    }
}