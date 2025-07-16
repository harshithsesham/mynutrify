// app/(dashboard)/page.tsx
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import DashboardClient from './DashboardClient'; // Import the new client component

// This line tells Next.js to render this page dynamically at request time
export const dynamic = 'force-dynamic';

type AppointmentWithOtherParty = {
    id: number;
    start_time: string;
    professional?: { full_name: string };
    client?: { full_name: string };
};

export default async function DashboardPage() {
    const supabase = createServerComponentClient({ cookies });

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        redirect('/login');
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role, full_name')
        .eq('id', session.user.id)
        .single();

    if (!profile) {
        // This could happen if the trigger failed. Redirecting to login is safer.
        redirect('/login');
    }

    if (!profile.role) {
        redirect('/role-selection');
    }

    let upcomingAppointments: AppointmentWithOtherParty[] = [];
    if (profile.role === 'client') {
        const { data } = await supabase
            .from('appointments')
            .select('*, professional:professional_id(full_name)')
            .eq('client_id', session.user.id)
            .eq('status', 'confirmed')
            .gte('start_time', new Date().toISOString())
            .order('start_time', { ascending: true })
            .limit(3);
        upcomingAppointments = data || [];
    } else {
        const { data } = await supabase
            .from('appointments')
            .select('*, client:client_id(full_name)')
            .eq('professional_id', session.user.id)
            .eq('status', 'confirmed')
            .gte('start_time', new Date().toISOString())
            .order('start_time', { ascending: true })
            .limit(3);
        upcomingAppointments = data || [];
    }

    // Render the Client Component and pass the fetched data as props
    return <DashboardClient profile={profile} upcomingAppointments={upcomingAppointments} />;
}