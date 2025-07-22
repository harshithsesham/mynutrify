// app/dashboard/my-appointments/page.tsx
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Calendar, User, Tag, IndianRupee } from 'lucide-react';
import { format } from 'date-fns';

export const dynamic = 'force-dynamic';

export default async function MyAppointmentsPage() {
    const supabase = createServerComponentClient({ cookies });

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        redirect('/login');
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('id, role')
        .eq('user_id', session.user.id)
        .single();

    if (!profile) {
        return <div className="text-red-500 p-8">Could not find your profile.</div>;
    }

    let appointmentsQuery;
    if (profile.role === 'client') {
        appointmentsQuery = supabase
            .from('appointments')
            .select('*, professional:professional_id(full_name)')
            .eq('client_id', profile.id)
            .order('start_time', { ascending: false });
    } else {
        appointmentsQuery = supabase
            .from('appointments')
            .select('*, client:client_id(full_name)')
            .eq('professional_id', profile.id)
            .order('start_time', { ascending: false });
    }

    const { data: appointments, error } = await appointmentsQuery;

    if (error) {
        console.error("Error fetching appointments:", error);
        return <div className="text-red-500 p-8">Error loading appointments.</div>;
    }

    return (
        <div className="max-w-5xl mx-auto text-gray-800">
            <h1 className="text-4xl font-bold mb-8">My Appointments</h1>
            <div className="space-y-6">
                {appointments && appointments.length > 0 ? (
                    appointments.map(apt => {
                        const otherPersonName = profile.role === 'client' ? apt.professional.full_name : apt.client.full_name;
                        const appointmentDate = new Date(apt.start_time);
                        const isPast = appointmentDate < new Date();

                        return (
                            <div key={apt.id} className={`bg-white border rounded-2xl p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 ${isPast ? 'border-gray-200 opacity-70' : 'border-gray-300 shadow-sm'}`}>
                                <div className="flex-grow">
                                    <div className="flex items-center gap-3 mb-2">
                                        <Calendar className="text-gray-500" size={20} />
                                        <span className="font-bold text-xl">{format(appointmentDate, 'MMMM do, yyyy')}</span>
                                        <span className="text-lg text-gray-600">at {format(appointmentDate, 'p')}</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-gray-600 mb-2">
                                        <User size={20} />
                                        <span>
                                            {profile.role === 'client' ? 'With' : 'With Client'}: <span className="font-semibold text-gray-800">{otherPersonName}</span>
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3 text-gray-600">
                                        <IndianRupee size={20} />
                                        <span>
                                            Price: <span className="font-semibold text-gray-800">₹{apt.price}</span>
                                            {apt.is_first_consult && <span className="text-xs ml-2 bg-green-100 text-green-800 px-2 py-1 rounded-full">First Consult</span>}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className={`flex items-center gap-2 text-sm font-medium px-3 py-1 rounded-full ${apt.status === 'confirmed' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
                                        <Tag size={16} />
                                        <span className="capitalize">{apt.status}</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="text-center text-gray-500 bg-gray-50 p-8 rounded-2xl border border-gray-200">
                        <h2 className="text-2xl font-bold mb-2">No Appointments Yet</h2>
                        <p>When you book an appointment, it will appear here.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
