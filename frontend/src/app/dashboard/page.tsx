// frontend/src/app/dashboard/page.tsx
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
    const cookieStore = await cookies();
    const supabase = createServerComponentClient({ cookies: () => cookieStore as any });

    // 1. Auth and Profile Check
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
        redirect('/login');
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('id, role, full_name')
        .eq('user_id', user.id)
        .single();

    if (!profile) {
        redirect('/login');
    }

    if (!profile.role) {
        redirect('/role-selection');
    }

    let upcomingAppointments: AppointmentWithOtherParty[] = [];
    const nowISO = new Date().toISOString();

    if (profile.role === 'client') {
        // Fetch appointments for client
        const { data } = await supabase
            .from('appointments')
            .select('*, professional:professional_id(full_name)')
            .eq('client_id', profile.id)
            .eq('status', 'confirmed')
            .gte('start_time', nowISO)
            .order('start_time', { ascending: true })
            .limit(3);

        upcomingAppointments = data || [];

    } else if (profile.role === 'health_coach') {
        try {
            const { data: healthCoachData } = await supabase
                .from('health_coaches')
                .select('id')
                .eq('profile_id', profile.id)
                .single();

            if (healthCoachData) {
                const today = new Date().toISOString().split('T')[0];

                // Get scheduled consultations
                const { data: consultations } = await supabase
                    .from('consultation_requests')
                    .select('id, full_name, email, scheduled_date, scheduled_time, meeting_link, meeting_type')
                    .eq('status', 'scheduled')
                    .eq('scheduled_by', healthCoachData.id)
                    .not('scheduled_date', 'is', null)
                    .gte('scheduled_date', today)
                    .order('scheduled_date', { ascending: true })
                    .order('scheduled_time', { ascending: true })
                    .limit(3);

                const consultationAppointments: AppointmentWithOtherParty[] = (consultations || [])
                    .filter(consultation => consultation.scheduled_date)
                    .map(consultation => {
                        let dateTime: string;
                        try {
                            const datePart = consultation.scheduled_date;
                            const timePart = consultation.scheduled_time || '09:00';
                            dateTime = `${datePart}T${timePart}:00.000Z`;
                        } catch (error) {
                            dateTime = new Date().toISOString();
                        }

                        return {
                            id: `consultation_${consultation.id}`,
                            start_time: dateTime,
                            client: { full_name: consultation.full_name || consultation.email || 'Unknown Client' },
                            meeting_link: consultation.meeting_link || undefined,
                            session_type: 'Health Consultation'
                        };
                    });

                // Also get any direct appointments if health coach has them
                const { data: directAppointments } = await supabase
                    .from('appointments')
                    .select('*, client:client_id(full_name)')
                    .eq('professional_id', profile.id)
                    .eq('status', 'confirmed')
                    .gte('start_time', nowISO)
                    .order('start_time', { ascending: true })
                    .limit(3);

                const regularAppointments: AppointmentWithOtherParty[] = (directAppointments || []).map(apt => ({
                    ...apt,
                    id: apt.id
                }));

                // Combine and sort by start time
                upcomingAppointments = [...consultationAppointments, ...regularAppointments]
                    .filter(apt => new Date(apt.start_time).getTime() >= new Date(nowISO).getTime())
                    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
                    .slice(0, 3);
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
            .gte('start_time', nowISO)
            .order('start_time', { ascending: true })
            .limit(3);

        upcomingAppointments = data || [];
    }

    return <DashboardClient profile={profile} upcomingAppointments={upcomingAppointments} />;
}