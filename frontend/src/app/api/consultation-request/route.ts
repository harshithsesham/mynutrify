// app/api/consultation-request/route.ts
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    const supabase = createRouteHandlerClient({ cookies });

    try {
        const formData = await req.json();
        console.log('Received consultation request:', formData);

        // Validate required fields
        const requiredFields = ['fullName', 'email', 'phone', 'age', 'gender', 'healthGoals'];
        const missingFields = requiredFields.filter(field => !formData[field]);

        if (missingFields.length > 0) {
            console.error('Missing required fields:', missingFields);
            return NextResponse.json(
                { error: `Missing required fields: ${missingFields.join(', ')}` },
                { status: 400 }
            );
        }

        // Create the consultation request (using your existing column names)
        const { data: consultationRequest, error: insertError } = await supabase
            .from('consultation_requests')
            .insert({
                full_name: formData.fullName,           // matches your 'full_name' column
                email: formData.email,                  // matches your 'email' column
                phone: formData.phone,                  // matches your 'phone' column
                age: parseInt(formData.age),            // matches your 'age' column
                gender: formData.gender,                // matches your 'gender' column
                health_goals: formData.healthGoals,     // matches your 'health_goals' column
                current_challenges: formData.currentChallenges || null, // matches your 'current_challenges' column
                preferred_days: formData.preferredDays || [],          // matches your 'preferred_days' column
                preferred_time_slots: formData.preferredTimeSlots || [], // matches your 'preferred_time_slots' column
                additional_info: formData.additionalInfo || null,      // matches your 'additional_info' column
                status: 'pending',                      // matches your 'status' column
                created_at: new Date().toISOString()   // matches your 'created_at' column
            })
            .select()
            .single();

        if (insertError) {
            console.error('Database insertion error:', insertError);
            return NextResponse.json(
                { error: 'Failed to save consultation request' },
                { status: 500 }
            );
        }

        console.log('Consultation request created successfully:', consultationRequest.id);

        // TODO: Send notification email to health coaches
        // TODO: Send confirmation email to client

        return NextResponse.json({
            success: true,
            id: consultationRequest.id,
            message: 'Consultation request submitted successfully'
        });

    } catch (error) {
        console.error('API error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// Handle CORS for the API endpoint
export async function OPTIONS() {
    return new NextResponse(null, {
        status: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        },
    });
}