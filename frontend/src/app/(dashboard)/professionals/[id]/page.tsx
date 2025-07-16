// app/(dashboard)/professionals/[id]/page.tsx
'use client';

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useEffect, useState, useMemo } from 'react';
import { Award, Calendar, Clock, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { format, addDays, getDay, parseISO, set } from 'date-fns';

// Define types for our data
type ProfessionalProfile = {
    id: string;
    full_name: string;
    bio: string | null;
    specialties: string[] | null;
    hourly_rate: number | null;
    role: 'nutritionist' | 'trainer';
};

type Availability = {
    day_of_week: number; // 0 = Sunday, 6 = Saturday
    start_time: string; // "HH:mm:ss"
    end_time: string;
};

type Appointment = {
    start_time: string; // ISO string
};

export default function ProfessionalProfilePage({ params }: { params: { id: string } }) {
    const supabase = createClientComponentClient();
    const professionalId = params.id;

    const [loading, setLoading] = useState(true);
    const [isBooking, setIsBooking] = useState(false);
    const [profile, setProfile] = useState<ProfessionalProfile | null>(null);
    const [availability, setAvailability] = useState<Availability[]>([]);
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [selectedDate, setSelectedDate] = useState(new Date());

    // State for the confirmation modal
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            const { data: profileData } = await supabase.from('profiles').select('id, full_name, bio, specialties, hourly_rate, role').eq('id', professionalId).single();
            setProfile(profileData);
            const { data: availabilityData } = await supabase.from('availability').select('day_of_week, start_time, end_time').eq('professional_id', professionalId);
            setAvailability(availabilityData || []);
            const { data: appointmentData } = await supabase.from('appointments').select('start_time').eq('professional_id', professionalId).gte('start_time', new Date().toISOString());
            setAppointments(appointmentData || []);
            setLoading(false);
        };
        fetchData();
    }, [supabase, professionalId]);

    const availableTimeSlots = useMemo(() => {
        const dayOfWeek = getDay(selectedDate);
        const professionalAvailability = availability.find(a => a.day_of_week === dayOfWeek);
        if (!professionalAvailability) return [];
        const bookedSlots = appointments.map(apt => parseISO(apt.start_time)).filter(d => format(d, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd')).map(d => format(d, 'HH:mm'));
        const slots = [];
        const startTime = parseInt(professionalAvailability.start_time.split(':')[0]);
        const endTime = parseInt(professionalAvailability.end_time.split(':')[0]);
        for (let hour = startTime; hour < endTime; hour++) {
            const time = `${String(hour).padStart(2, '0')}:00`;
            if (!bookedSlots.includes(time)) slots.push(time);
        }
        return slots;
    }, [selectedDate, availability, appointments]);

    const handleSlotClick = (time: string) => {
        setSelectedSlot(time);
        setShowConfirmModal(true);
    };

    const handleConfirmBooking = async () => {
        if (!selectedSlot || !profile) return;
        setIsBooking(true);

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            alert("You must be logged in to book an appointment.");
            setIsBooking(false);
            return;
        }

        const { data: existingAppointments, error: checkError } = await supabase.from('appointments').select('id').eq('client_id', user.id).limit(1);
        if (checkError) {
            alert("Error checking your appointment history. Please try again.");
            setIsBooking(false);
            return;
        }

        const isFirstConsult = existingAppointments.length === 0;
        const price = isFirstConsult ? 0 : profile.hourly_rate;

        const [hour, minute] = selectedSlot.split(':').map(Number);
        const appointmentStartTime = set(selectedDate, { hours: hour, minutes: minute, seconds: 0, milliseconds: 0 });
        const appointmentEndTime = set(appointmentStartTime, { hours: appointmentStartTime.getHours() + 1 });

        const { error: insertError } = await supabase.from('appointments').insert({
            client_id: user.id,
            professional_id: professionalId,
            start_time: appointmentStartTime.toISOString(),
            end_time: appointmentEndTime.toISOString(),
            price: price,
            is_first_consult: isFirstConsult,
            status: 'confirmed',
        });

        if (insertError) {
            alert(`Failed to book appointment: ${insertError.message}`);
        } else {
            setAppointments([...appointments, { start_time: appointmentStartTime.toISOString() }]);
            setShowConfirmModal(false);
            setSelectedSlot(null);
            alert('Appointment booked successfully!');
        }
        setIsBooking(false);
    };

    if (loading) return <div className="text-white text-center p-8">Loading Profile...</div>;
    if (!profile) return <div className="text-white text-center p-8">Professional not found.</div>;

    return (
        <>
            {/* Main Page Content */}
            <div className="max-w-6xl mx-auto p-4 sm:p-8 text-white grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Profile Info */}
                <div className="lg:col-span-1 bg-gray-800 p-6 rounded-2xl self-start">
                    <h1 className="text-3xl font-bold">{profile.full_name}</h1>
                    <p className="text-lg capitalize text-green-400 mb-4">{profile.role}</p>
                    {profile.hourly_rate !== null && (
                        <div className="flex items-center text-lg font-semibold mb-4">
                            <span className="text-green-400 font-bold mr-1">₹</span>
                            {profile.hourly_rate === 0 ? 'Free' : `${profile.hourly_rate} / hour`}
                        </div>
                    )}
                    <p className="text-gray-300 mb-6">{profile.bio}</p>
                    {profile.specialties && profile.specialties.length > 0 && (
                        <div>
                            <h3 className="font-semibold mb-2 flex items-center text-xl"><Award size={22} className="mr-2 text-green-400"/> Specialties</h3>
                            <div className="flex flex-wrap gap-2">
                                {profile.specialties.map(spec => (<span key={spec} className="bg-gray-700 text-gray-200 text-sm px-3 py-1 rounded-full">{spec}</span>))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Column: Booking Calendar */}
                <div className="lg:col-span-2 bg-gray-800 p-6 rounded-2xl">
                    <h2 className="text-2xl font-bold mb-4 flex items-center"><Calendar size={24} className="mr-3 text-green-400" /> Book an Appointment</h2>
                    <div className="flex items-center justify-between mb-4">
                        <button onClick={() => setSelectedDate(addDays(selectedDate, -1))} className="p-2 rounded-full hover:bg-gray-700"><ChevronLeft/></button>
                        <h3 className="text-xl font-semibold">{format(selectedDate, 'MMMM do, yyyy')}</h3>
                        <button onClick={() => setSelectedDate(addDays(selectedDate, 1))} className="p-2 rounded-full hover:bg-gray-700"><ChevronRight/></button>
                    </div>
                    <div className="border-t border-gray-700 pt-4">
                        <h4 className="font-semibold mb-4 flex items-center"><Clock size={18} className="mr-2 text-green-400"/> Available Slots for {format(selectedDate, 'eeee')}</h4>
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
                            {availableTimeSlots.length > 0 ? (
                                availableTimeSlots.map(time => (<button key={time} onClick={() => handleSlotClick(time)} className="bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-2 rounded-lg transition duration-300 text-center">{time}</button>))
                            ) : (<p className="text-gray-400 col-span-full">No available slots for this day.</p>)}
                        </div>
                    </div>
                </div>
            </div>

            {/* Confirmation Modal */}
            {showConfirmModal && (
                <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
                    <div className="bg-gray-800 rounded-2xl p-8 max-w-sm w-full shadow-lg text-white">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-2xl font-bold text-green-400">Confirm Booking</h2>
                            <button onClick={() => setShowConfirmModal(false)} className="text-gray-400 hover:text-white"><X size={24}/></button>
                        </div>
                        <p className="mb-2">You are about to book an appointment with:</p>
                        <p className="font-bold text-lg mb-4">{profile.full_name}</p>
                        <p className="mb-2">On <span className="font-semibold">{format(selectedDate, 'MMMM do, yyyy')}</span> at <span className="font-semibold">{selectedSlot}</span>.</p>
                        <div className="mt-6 flex justify-end gap-4">
                            <button onClick={() => setShowConfirmModal(false)} className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg">Cancel</button>
                            <button onClick={handleConfirmBooking} disabled={isBooking} className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg disabled:bg-gray-500">
                                {isBooking ? 'Booking...' : 'Confirm'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
