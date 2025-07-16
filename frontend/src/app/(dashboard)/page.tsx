import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Calendar, Link as LinkIcon } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';

// Define a specific type for the appointment data we're fetching
type AppointmentWithOtherParty = {
    id: number;
    start_time: string;
    professional?: { full_name: string };
    client?: { full_name: string };
};

// This is the main dashboard page, acting as a Server Component.
export default async function DashboardPage() {
    const supabase = createServerComponentClient({ cookies });

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        redirect('/login');
    }

    // Fetch the user's profile to determine their role and name
    const { data: profile } = await supabase
        .from('profiles')
        .select('role, full_name')
        .eq('id', session.user.id)
        .single();

    if (!profile) {
        return <div className="text-red-400 p-8">Could not load your profile.</div>;
    }

    // If a new user lands here without a role, send them to selection
    if (!profile.role) {
        redirect('/role-selection');
    }

    // Fetch data specific to the user's role
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
    } else { // For 'nutritionist' or 'trainer'
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

    return (
        <div className="max-w-7xl mx-auto p-4 sm:p-8 text-white">
            <h1 className="text-4xl font-bold">Welcome back, {profile.full_name}!</h1>
            <p className="text-lg capitalize text-green-400 mb-8">{profile.role} Dashboard</p>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Content: Upcoming Appointments */}
                <div className="lg:col-span-2 bg-gray-800 p-6 rounded-2xl">
                    <h2 className="text-2xl font-semibold mb-4 flex items-center">
                        <Calendar size={24} className="mr-3 text-green-400" />
                        Upcoming Appointments
                    </h2>
                    <div className="space-y-4">
                        {upcomingAppointments.length > 0 ? (
                            upcomingAppointments.map((apt) => (
                                <div key={apt.id} className="bg-gray-700 p-4 rounded-lg flex justify-between items-center">
                                    <div>
                                        <p className="font-bold">{format(new Date(apt.start_time), 'MMMM do, yyyy')} at {format(new Date(apt.start_time), 'p')}</p>
                                        <p className="text-gray-300">With {profile.role === 'client' ? apt.professional?.full_name : apt.client?.full_name}</p>
                                    </div>
                                    <Link href="/my-appointments" className="text-green-400 hover:text-green-300 font-semibold">
                                        View
                                    </Link>
                                </div>
                            ))
                        ) : (
                            <p className="text-gray-400">You have no upcoming appointments.</p>
                        )}
                    </div>
                </div>

                {/* Sidebar: Quick Actions */}
                <div className="lg:col-span-1 bg-gray-800 p-6 rounded-2xl">
                    <h2 className="text-2xl font-semibold mb-4 flex items-center">
                        <LinkIcon size={24} className="mr-3 text-green-400" />
                        Quick Links
                    </h2>
                    <div className="space-y-4">
                        <Link href="/my-appointments" className="block bg-gray-700 hover:bg-gray-600 p-4 rounded-lg transition-colors">
                            View All Appointments
                        </Link>
                        {profile.role === 'client' && (
                            <Link href="/find-a-pro" className="block bg-gray-700 hover:bg-gray-600 p-4 rounded-lg transition-colors">
                                Find a New Professional
                            </Link>
                        )}
                        {(profile.role === 'nutritionist' || profile.role === 'trainer') && (
                            <Link href="/settings/profile" className="block bg-gray-700 hover:bg-gray-600 p-4 rounded-lg transition-colors">
                                Edit Profile & Availability
                            </Link>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}