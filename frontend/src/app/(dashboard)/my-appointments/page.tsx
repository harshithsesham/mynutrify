// app/(dashboard)/my-appointments/page.tsx
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Calendar, User, Tag, IndianRupee } from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function MyAppointmentsPage() {
    const supabase = createServerComponentClient({ cookies });

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        redirect('/login');
    }

    // First, get the current user's profile, including their profile ID
    const { data: profile } = await supabase
        .from('profiles')
        .select('id, role')
        .eq('user_id', session.user.id)
        .single();

    if (!profile) {
        return <div className="text-red-400 p-8">Could not find your profile.</div>;
    }

    // Then, fetch appointments based on the user's role and profile ID
    let appointmentsQuery;
    if (profile.role === 'client') {
        appointmentsQuery = supabase
            .from('appointments')
            .select('*, professional:professional_id(full_name)')
            .eq('client_id', profile.id) // Correctly use profile.id
            .order('start_time', { ascending: true });
    } else {
        appointmentsQuery = supabase
            .from('appointments')
            .select('*, client:client_id(full_name)')
            .eq('professional_id', profile.id) // Correctly use profile.id
            .order('start_time', { ascending: true });
    }

    const { data: appointments, error } = await appointmentsQuery;

    if (error) {
        console.error("Error fetching appointments:", error);
        return <div className="text-red-400 p-8">Error loading appointments.</div>;
    }

    return (
        <div className="max-w-5xl mx-auto p-4 sm:p-8 text-white">
            <h1 className="text-4xl font-bold mb-8">My Appointments</h1>

            <div className="space-y-6">
                {appointments && appointments.length > 0 ? (
                    appointments.map(apt => {
                        const otherPersonName = profile.role === 'client' ? apt.professional.full_name : apt.client.full_name;
                        const appointmentDate = new Date(apt.start_time);

                        return (
                            <div key={apt.id} className="bg-gray-800 rounded-2xl p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                <div className="flex-grow">
                                    <div className="flex items-center gap-3 mb-2">
                                        <Calendar className="text-green-400" size={20} />
                                        <span className="font-bold text-xl">{format(appointmentDate, 'MMMM do, yyyy')}</span>
                                        <span className="text-lg text-gray-300">at {format(appointmentDate, 'p')}</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-gray-300 mb-2">
                                        <User size={20} />
                                        <span>
                      {profile.role === 'client' ? 'With' : 'With Client'}: <span className="font-semibold text-white">{otherPersonName}</span>
                    </span>
                                    </div>
                                    <div className="flex items-center gap-3 text-gray-300">
                                        <IndianRupee size={20} />
                                        <span>
                      Price: <span className="font-semibold text-white">₹{apt.price}</span>
                                            {apt.is_first_consult && <span className="text-xs ml-2 bg-green-500/20 text-green-300 px-2 py-1 rounded-full">First Consult</span>}
                    </span>
                                    </div>
                                </div>
                                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
                                    <div className="flex items-center gap-3 text-gray-300 bg-gray-700 px-4 py-2 rounded-lg justify-center">
                                        <Tag size={20} />
                                        <span className="capitalize font-semibold">{apt.status}</span>
                                    </div>
                                    {/* The cancel button would need to be moved to a client component to be interactive */}
                                    {apt.status === 'confirmed' && (
                                        <button className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg transition duration-300 opacity-50 cursor-not-allowed">
                                            Cancel
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="text-center text-gray-400 bg-gray-800 p-8 rounded-2xl">
                        <h2 className="text-2xl font-bold mb-2">No Appointments Yet</h2>
                        <p>You have no upcoming or past appointments.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
