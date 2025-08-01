// app/api/consultation-request/route.ts
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    console.log('🔥 Consultation request API called');

    // Add CORS headers
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Accept',
    };

    try {
        const formData = await req.json();
        console.log('📝 Received form data:', JSON.stringify(formData, null, 2));

        // Validate required fields
        const requiredFields = ['fullName', 'email', 'phone', 'age', 'gender', 'healthGoals'];
        const missingFields = requiredFields.filter(field => !formData[field] || formData[field].toString().trim() === '');

        if (missingFields.length > 0) {
            console.error('❌ Missing required fields:', missingFields);
            return NextResponse.json(
                { error: `Missing required fields: ${missingFields.join(', ')}` },
                { status: 400, headers: corsHeaders }
            );
        }

        // Create Supabase client
        const supabase = createRouteHandlerClient({ cookies });
        console.log('📡 Supabase client created');

        // Prepare data for insertion
        const insertData = {
            full_name: formData.fullName.toString().trim(),
            email: formData.email.toString().trim().toLowerCase(),
            phone: formData.phone.toString().trim(),
            age: parseInt(formData.age.toString()),
            gender: formData.gender.toString().trim(),
            health_goals: formData.healthGoals.toString().trim(),
            current_challenges: formData.currentChallenges ? formData.currentChallenges.toString().trim() : null,
            preferred_days: Array.isArray(formData.preferredDays) ? formData.preferredDays : [],
            preferred_time_slots: Array.isArray(formData.preferredTimeSlots) ? formData.preferredTimeSlots : [],
            additional_info: formData.additionalInfo ? formData.additionalInfo.toString().trim() : null,
            status: 'pending'
        };

        console.log('💾 Data prepared for insertion:', JSON.stringify(insertData, null, 2));

        // Insert into database
        const { data: consultationRequest, error: insertError } = await supabase
            .from('consultation_requests')
            .insert(insertData)
            .select()
            .single();

        if (insertError) {
            console.error('❌ Database insertion error:', insertError);
            console.error('Error details:', {
                code: insertError.code,
                message: insertError.message,
                details: insertError.details,
                hint: insertError.hint
            });

            // Return more specific error based on the type
            let errorMessage = 'Failed to save consultation request';
            if (insertError.code === '23505') {
                errorMessage = 'A request with this email already exists';
            } else if (insertError.code === '42501') {
                errorMessage = 'Permission denied - please try again';
            } else if (insertError.message.includes('violates')) {
                errorMessage = 'Invalid data provided';
            }

            return NextResponse.json(
                { error: errorMessage, details: insertError.message },
                { status: 500, headers: corsHeaders }
            );
        }

        console.log('✅ Consultation request created successfully:', consultationRequest?.id);

        // Return success response
        const response = NextResponse.json({
            success: true,
            id: consultationRequest?.id,
            message: 'Consultation request submitted successfully'
        }, { headers: corsHeaders });

        return response;

    } catch (error) {
        console.error('💥 API error:', error);
        console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');

        let errorMessage = 'Internal server error';
        if (error instanceof SyntaxError) {
            errorMessage = 'Invalid request format';
        } else if (error instanceof Error) {
            errorMessage = `Server error: ${error.message}`;
        }

        return NextResponse.json(
            { error: errorMessage, details: error instanceof Error ? error.message : String(error) },
            { status: 500, headers: corsHeaders }
        );
    }
}

// Handle CORS preflight requests
export async function OPTIONS() {
    return new NextResponse(null, {
        status: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Accept',
        },
    });
}