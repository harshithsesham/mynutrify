// frontend/src/app/dashboard/page.tsx
// Fixed version that properly shows scheduled consultations for health coaches

import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import DashboardClient from './DashboardClient';

export const dynamic = 'force-dynamic';

type AppointmentWithOtherParty = {
    id: number | string;
    start_time: string;
    professional?: { full_name: string };
    client?: { full_name: string };
    meeting_link?: string;
    session_type?: string;
};

export default async function DashboardPage() {
    const supabase = createServerComponentClient({ cookies });

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        redirect('/login');
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('id, role, full_name')
        .eq('user_id', session.user.id)
        .single();

    if (!profile) {
        redirect('/login');
    }

    if (!profile.role) {
        redirect('/role-selection');
    }

    let upcomingAppointments: AppointmentWithOtherParty[] = [];

    if (profile.role === 'client') {
        // For clients - get appointments as before
        const { data } = await supabase
            .from('appointments')
            .select('*, professional:professional_id(full_name)')
            .eq('client_id', profile.id)
            .eq('status', 'confirmed')
            .gte('start_time', new Date().toISOString())
            .order('start_time', { ascending: true })
            .limit(3);

        upcomingAppointments = data || [];

    } else if (profile.role === 'health_coach') {
        // For health coaches - get scheduled consultation requests
        try {
            // Get health coach ID
            const { data: healthCoachData } = await supabase
                .from('health_coaches')
                .select('id')
                .eq('profile_id', profile.id)
                .single();

            if (healthCoachData) {
                // Get scheduled consultations
                const today = new Date().toISOString().split('T')[0];
                console.log('Fetching consultations for health coach:', healthCoachData.id);
                console.log('Today date:', today);

                const { data: consultations, error: consultationError } = await supabase
                    .from('consultation_requests')
                    .select('id, full_name, email, scheduled_date, scheduled_time, meeting_link, meeting_type')
                    .eq('status', 'scheduled')
                    .eq('scheduled_by', healthCoachData.id)
                    .not('scheduled_date', 'is', null)
                    .gte('scheduled_date', today)
                    .order('scheduled_date', { ascending: true })
                    .order('scheduled_time', { ascending: true })
                    .limit(3);

                console.log('Consultation query result:', consultations);
                console.log('Consultation query error:', consultationError);

                // Transform consultation requests to match appointment format
                const consultationAppointments: AppointmentWithOtherParty[] = (consultations || []).map(consultation => {
                    // Combine date and time for start_time
                    const dateTime = consultation.scheduled_time
                        ? `${consultation.scheduled_date}T${consultation.scheduled_time}:00`
                        : `${consultation.scheduled_date}T09:00:00`;

                    return {
                        id: `consultation_${consultation.id}`,
                        start_time: dateTime,
                        client: { full_name: consultation.full_name || consultation.email || 'Unknown Client' },
                        meeting_link: consultation.meeting_link || undefined,
                        session_type: 'Health Consultation'
                    };
                });

                console.log('Transformed consultations:', consultationAppointments);

                // Also get any direct appointments if health coach has them
                const { data: directAppointments } = await supabase
                    .from('appointments')
                    .select('*, client:client_id(full_name)')
                    .eq('professional_id', profile.id)
                    .eq('status', 'confirmed')
                    .gte('start_time', new Date().toISOString())
                    .order('start_time', { ascending: true })
                    .limit(3);

                const regularAppointments: AppointmentWithOtherParty[] = (directAppointments || []).map(apt => ({
                    ...apt,
                    id: apt.id
                }));

                // Combine and sort by start time
                upcomingAppointments = [...consultationAppointments, ...regularAppointments]
                    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
                    .slice(0, 3); // Keep only top 3
            }
        } catch (error) {
            console.error('Error fetching health coach appointments:', error);
            upcomingAppointments = [];
        }

    } else if (profile.role === 'nutritionist' || profile.role === 'trainer') {
        // For nutritionists and trainers - get regular appointments
        const { data } = await supabase
            .from('appointments')
            .select('*, client:client_id(full_name)')
            .eq('professional_id', profile.id)
            .eq('status', 'confirmed')
            .gte('start_time', new Date().toISOString())
            .order('start_time', { ascending: true })
            .limit(3);

        upcomingAppointments = data || [];
    }

    return <DashboardClient profile={profile} upcomingAppointments={upcomingAppointments} />;
}