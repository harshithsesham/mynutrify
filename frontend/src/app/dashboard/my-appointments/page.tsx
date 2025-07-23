// app/dashboard/my-appointments/page.tsx
'use client';

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useEffect, useState, useCallback } from 'react';
import { Calendar, User, Tag, IndianRupee } from 'lucide-react';
import { format, isBefore, startOfToday } from 'date-fns';

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
    const [allAppointments, setAllAppointments] = useState<Appointment[]>([]);
    const [userRole, setUserRole] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');

    const fetchAppointments = useCallback(async () => {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            setLoading(false);
            return;
        }

        const { data: profile } = await supabase.from('profiles').select('id, role').eq('user_id', user.id).single();
        if (profile) {
            setUserRole(profile.role);
            let query;
            if (profile.role === 'client') {
                query = supabase.from('appointments').select('*, professional:professional_id(full_name)').eq('client_id', profile.id);
            } else {
                query = supabase.from('appointments').select('*, client:client_id(full_name)').eq('professional_id', profile.id);
            }
            const { data, error } = await query.order('start_time', { ascending: false });
            if (!error) setAllAppointments(data || []);
        }
        setLoading(false);
    }, [supabase]);

    useEffect(() => {
        fetchAppointments();
    }, [fetchAppointments]);

    const handleCancelAppointment = async (appointmentId: number) => {
        if (window.confirm('Are you sure you want to cancel this appointment?')) {
            const { error } = await supabase
                .from('appointments')
                .update({ status: 'cancelled' })
                .eq('id', appointmentId);

            if (error) {
                alert('Failed to cancel appointment: ' + error.message);
            } else {
                setAllAppointments(prev =>
                    prev.map(apt =>
                        apt.id === appointmentId ? { ...apt, status: 'cancelled' } : apt
                    )
                );
            }
        }
    };

    const upcomingAppointments = allAppointments.filter(apt => apt.status === 'confirmed' && !isBefore(new Date(apt.start_time), startOfToday()));
    const pastAppointments = allAppointments.filter(apt => apt.status !== 'confirmed' || isBefore(new Date(apt.start_time), startOfToday()));

    const renderAppointmentList = (appointments: Appointment[]) => {
        if (appointments.length === 0) {
            return (
                <div className="text-center text-gray-500 py-12 bg-gray-50 rounded-2xl border border-gray-200">
                    <h2 className="text-2xl font-bold mb-2">No Appointments Here</h2>
                    <p>There are no appointments to show in this category.</p>
                </div>
            );
        }

        return (
            <div className="space-y-6">
                {appointments.map(apt => {
                    const otherPersonName = userRole === 'client' ? apt.professional?.full_name : apt.client?.full_name;
                    const appointmentDate = new Date(apt.start_time);
                    const isPast = isBefore(appointmentDate, startOfToday());

                    return (
                        <div key={apt.id} className={`bg-white border rounded-2xl p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 ${isPast || apt.status !== 'confirmed' ? 'border-gray-200 opacity-70' : 'border-gray-300 shadow-sm'}`}>
                            <div className="flex-grow">
                                <div className="flex items-center gap-3 mb-2">
                                    <Calendar className="text-gray-500" size={20} />
                                    <span className="font-bold text-xl">{format(appointmentDate, 'MMMM do, yyyy')}</span>
                                    <span className="text-lg text-gray-600">at {format(appointmentDate, 'p')}</span>
                                </div>
                                <div className="flex items-center gap-3 text-gray-600 mb-2">
                                    <User size={20} />
                                    <span>{userRole === 'client' ? 'With' : 'With Client'}: <span className="font-semibold text-gray-800">{otherPersonName}</span></span>
                                </div>
                                <div className="flex items-center gap-3 text-gray-600">
                                    <IndianRupee size={20} />
                                    <span>Price: <span className="font-semibold text-gray-800">₹{apt.price}</span>{apt.is_first_consult && <span className="text-xs ml-2 bg-green-100 text-green-800 px-2 py-1 rounded-full">First Consult</span>}</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className={`flex items-center gap-2 text-sm font-medium px-3 py-1 rounded-full ${apt.status === 'confirmed' ? 'bg-blue-100 text-blue-800' : apt.status === 'cancelled' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}`}>
                                    <Tag size={16} />
                                    <span className="capitalize">{apt.status}</span>
                                </div>
                                {apt.status === 'confirmed' && !isPast && (
                                    <button onClick={() => handleCancelAppointment(apt.id)} className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg transition duration-300">
                                        Cancel
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    if (loading) return <div className="text-center p-8 text-gray-500">Loading appointments...</div>;

    return (
        <div className="max-w-5xl mx-auto text-gray-800">
            <h1 className="text-3xl font-bold mb-8">My Appointments</h1>

            <div className="flex border-b border-gray-200 mb-8">
                <button onClick={() => setActiveTab('upcoming')} className={`py-3 px-6 font-semibold ${activeTab === 'upcoming' ? 'border-b-2 border-gray-800 text-gray-800' : 'text-gray-500'}`}>
                    Upcoming
                </button>
                <button onClick={() => setActiveTab('past')} className={`py-3 px-6 font-semibold ${activeTab === 'past' ? 'border-b-2 border-gray-800 text-gray-800' : 'text-gray-500'}`}>
                    Past & Cancelled
                </button>
            </div>

            {activeTab === 'upcoming' ? renderAppointmentList(upcomingAppointments) : renderAppointmentList(pastAppointments)}
        </div>
    );
}
