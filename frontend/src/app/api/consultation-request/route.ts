// app/api/consultation-request/route.ts
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

// Enable CORS for all origins (you can restrict this in production)
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Accept, Authorization',
};

export async function OPTIONS() {
    return new NextResponse(null, {
        status: 200,
        headers: corsHeaders,
    });
}

export async function POST(req: NextRequest) {
    console.log('🔥 Consultation request API called');

    try {
        // Parse the request body
        const formData = await req.json();
        console.log('📝 Received form data:', JSON.stringify(formData, null, 2));

        // Validate required fields
        const requiredFields = ['fullName', 'email', 'phone', 'age', 'gender', 'healthGoals'];
        const missingFields = requiredFields.filter(field =>
            !formData[field] || formData[field].toString().trim() === ''
        );

        if (missingFields.length > 0) {
            console.error('❌ Missing required fields:', missingFields);
            return NextResponse.json(
                {
                    success: false,
                    error: `Missing required fields: ${missingFields.join(', ')}`
                },
                { status: 400, headers: corsHeaders }
            );
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Invalid email format'
                },
                { status: 400, headers: corsHeaders }
            );
        }

        // Validate age
        const age = parseInt(formData.age.toString());
        if (isNaN(age) || age < 16 || age > 100) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Age must be between 16 and 100'
                },
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
            age: age,
            gender: formData.gender.toString().trim(),
            health_goals: formData.healthGoals.toString().trim(),
            current_challenges: formData.currentChallenges ? formData.currentChallenges.toString().trim() : null,
            preferred_days: Array.isArray(formData.preferredDays) ? formData.preferredDays : [],
            preferred_time_slots: Array.isArray(formData.preferredTimeSlots) ? formData.preferredTimeSlots : [],
            additional_info: formData.additionalInfo ? formData.additionalInfo.toString().trim() : null,
            status: 'pending',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        console.log('💾 Data prepared for insertion:', JSON.stringify(insertData, null, 2));

        // Check if email already exists (prevent duplicates)
        const { data: existingRequest } = await supabase
            .from('consultation_requests')
            .select('id, email, status')
            .eq('email', insertData.email)
            .eq('status', 'pending')
            .single();

        if (existingRequest) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'A pending consultation request already exists for this email address'
                },
                { status: 409, headers: corsHeaders }
            );
        }

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

            // Handle specific error types
            let errorMessage = 'Failed to save consultation request';
            if (insertError.code === '23505') {
                errorMessage = 'A request with this email already exists';
            } else if (insertError.code === '42501') {
                errorMessage = 'Permission denied - database access issue';
            } else if (insertError.code === '42P01') {
                errorMessage = 'Database table not found';
            } else if (insertError.message.includes('violates')) {
                errorMessage = 'Invalid data provided';
            }

            return NextResponse.json(
                {
                    success: false,
                    error: errorMessage,
                    details: process.env.NODE_ENV === 'development' ? insertError.message : undefined
                },
                { status: 500, headers: corsHeaders }
            );
        }

        console.log('✅ Consultation request created successfully:', consultationRequest?.id);

        // Return success response
        const response = NextResponse.json({
            success: true,
            id: consultationRequest?.id,
            message: 'Consultation request submitted successfully',
            data: {
                id: consultationRequest?.id,
                email: consultationRequest?.email,
                status: consultationRequest?.status,
                created_at: consultationRequest?.created_at
            }
        }, {
            status: 201,
            headers: corsHeaders
        });

        return response;

    } catch (error) {
        console.error('💥 API error:', error);
        console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');

        let errorMessage = 'Internal server error';
        if (error instanceof SyntaxError) {
            errorMessage = 'Invalid request format - please check your data';
        } else if (error instanceof Error) {
            errorMessage = `Server error: ${error.message}`;
        }

        return NextResponse.json(
            {
                success: false,
                error: errorMessage,
                details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : undefined
            },
            {
                status: 500,
                headers: corsHeaders
            }
        );
    }
}