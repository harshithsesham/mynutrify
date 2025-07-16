// app/(dashboard)/my-appointments/page.tsx
'use client';

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useEffect, useState, useCallback } from 'react';
import { Calendar, User, Tag, IndianRupee } from 'lucide-react';
import { format } from 'date-fns';

// Define a more specific type for appointments to use in state
type Appointment = {
    id: number;
    start_time: string;
    price: number;
    is_first_consult: boolean;
    status: string;
    professional?: { full_name: string };
    client?: { full_name: string };
};

export default function MyAppointmentsPage() {
    const supabase = createClientComponentClient();
    const [loading, setLoading] = useState(true);
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [userRole, setUserRole] = useState<string | null>(null);

    const fetchAppointments = useCallback(async () => {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            setLoading(false);
            return;
        }

        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
        if (profile) {
            setUserRole(profile.role);
            let query;
            if (profile.role === 'client') {
                query = supabase.from('appointments').select('*, professional:professional_id(full_name)').eq('client_id', user.id);
            } else {
                query = supabase.from('appointments').select('*, client:client_id(full_name)').eq('professional_id', user.id);
            }
            const { data, error } = await query.order('start_time', { ascending: true });
            if (!error) setAppointments(data || []);
        }
        setLoading(false);
    }, [supabase]);

    useEffect(() => {
        fetchAppointments();
    }, [fetchAppointments]);

    const handleCancelAppointment = async (appointmentId: number) => {
        if (confirm('Are you sure you want to cancel this appointment?')) {
            const { error } = await supabase
                .from('appointments')
                .update({ status: 'cancelled' })
                .eq('id', appointmentId);

            if (error) {
                alert('Failed to cancel appointment: ' + error.message);
            } else {
                // Update the state to reflect the change immediately
                setAppointments(prev =>
                    prev.map(apt =>
                        apt.id === appointmentId ? { ...apt, status: 'cancelled' } : apt
                    )
                );
            }
        }
    };

    if (loading) {
        return <div className="text-white text-center p-8">Loading appointments...</div>;
    }

    return (
        <div className="max-w-5xl mx-auto p-4 sm:p-8 text-white">
            <h1 className="text-4xl font-bold mb-8">My Appointments</h1>
            <div className="space-y-6">
                {appointments.length > 0 ? (
                    appointments.map(apt => {
                        const otherPersonName = userRole === 'client' ? apt.professional?.full_name : apt.client?.full_name;
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
                      {userRole === 'client' ? 'With' : 'With Client'}: <span className="font-semibold text-white">{otherPersonName}</span>
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
                                    {apt.status === 'confirmed' && (
                                        <button
                                            onClick={() => handleCancelAppointment(apt.id)}
                                            className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg transition duration-300"
                                        >
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
