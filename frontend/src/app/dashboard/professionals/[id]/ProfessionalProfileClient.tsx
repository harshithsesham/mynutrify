// app/dashboard/professionals/[id]/ProfessionalProfileClient.tsx
'use client';

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useEffect, useState, useMemo, FC } from 'react';
import { Star, MessageSquare, Clock, ChevronLeft, ChevronRight, X, CheckCircle } from 'lucide-react';
import { format, addMonths, subMonths, getDay, parseISO, set, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isBefore, startOfToday, startOfWeek, endOfWeek } from 'date-fns';

// --- TYPE DEFINITIONS ---
type ProfessionalProfile = { id: string; full_name: string; bio: string | null; specialties: string[] | null; role: 'nutritionist' | 'trainer'; interests: string[] | null; hourly_rate: number | null; };
type Availability = { day_of_week: number; start_time: string; end_time: string; };
type Appointment = { start_time: string; };
type Review = { id: number; rating: number; content: string; created_at: string; client: { full_name: string }; };

// --- SUCCESS MODAL ---
const SuccessModal: FC<{ onClose: () => void; professionalName: string; appointmentTime: Date; }> = ({ onClose, professionalName, appointmentTime }) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-lg text-center">
            <CheckCircle size={56} className="text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Appointment Booked!</h2>
            <p className="text-gray-600">
                A Google Meet link has been created and will be available in your "My Appointments" section.
            </p>
            <button onClick={onClose} className="mt-6 w-full bg-gray-800 text-white font-bold py-3 px-4 rounded-lg hover:bg-gray-700">
                Done
            </button>
        </div>
    </div>
);

// --- BOOKING MODAL ---
const BookingModal: FC<{
    professional: ProfessionalProfile;
    availability: Availability[];
    existingAppointments: Appointment[];
    onClose: () => void;
    onBookingSuccess: (newAppointment: Appointment) => void;
}> = ({ professional, availability, existingAppointments, onClose, onBookingSuccess }) => {
    const supabase = createClientComponentClient();
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
    const [isBooking, setIsBooking] = useState(false);
    const [bookingSuccessData, setBookingSuccessData] = useState<{ time: Date } | null>(null);

    const calendarData = useMemo(() => {
        const today = startOfToday();
        const start = startOfWeek(startOfMonth(currentMonth));
        const end = endOfWeek(endOfMonth(currentMonth));
        const daysInMonth = eachDayOfInterval({ start, end });

        const availableDays = new Set<string>();
        availability.forEach(avail => {
            daysInMonth.forEach(day => {
                if (getDay(day) === avail.day_of_week && !isBefore(day, today)) {
                    availableDays.add(format(day, 'yyyy-MM-dd'));
                }
            });
        });
        return { daysInMonth, today, availableDaysInMonth: availableDays };
    }, [currentMonth, availability]);

    const availableTimeSlots = useMemo(() => {
        if (!selectedDate) return [];
        const dayOfWeek = getDay(selectedDate);
        const dayAvailability = availability.find(a => a.day_of_week === dayOfWeek);
        if (!dayAvailability) return [];
        const bookedSlots = existingAppointments.map(apt => parseISO(apt.start_time)).filter(d => isSameDay(d, selectedDate)).map(d => format(d, 'HH:mm'));
        const slots = [];
        const startTime = parseInt(dayAvailability.start_time.split(':')[0]);
        const endTime = parseInt(dayAvailability.end_time.split(':')[0]);
        for (let hour = startTime; hour < endTime; hour++) {
            const time = `${String(hour).padStart(2, '0')}:00`;
            if (!bookedSlots.includes(time)) slots.push(time);
        }
        return slots;
    }, [selectedDate, availability, existingAppointments]);

    const handleConfirmBooking = async () => {
        if (!selectedSlot || !selectedDate || !professional) return;
        setIsBooking(true);

        const { data: { user } } = await supabase.auth.getUser();
        if (!user || !user.email) { alert("You must be logged in to book."); setIsBooking(false); return; }

        const { data: clientProfile } = await supabase.from('profiles').select('id').eq('user_id', user.id).single();
        if (!clientProfile) { alert("Could not find your profile."); setIsBooking(false); return; }

        const { count } = await supabase.from('appointments').select('*', { count: 'exact', head: true }).eq('client_id', clientProfile.id);
        const isFirstConsult = count === 0;
        const price = isFirstConsult ? 0 : (professional.hourly_rate || 0);
        const [hour] = selectedSlot.split(':').map(Number);
        const appointmentStartTime = set(selectedDate, { hours: hour, minutes: 0, seconds: 0, milliseconds: 0 });
        const appointmentEndTime = set(appointmentStartTime, { hours: hour + 1 });

        // Step 1: Create the appointment in Supabase to get an ID
        const { data: newAppointment, error: insertError } = await supabase.from('appointments').insert({
            client_id: clientProfile.id,
            professional_id: professional.id,
            start_time: appointmentStartTime.toISOString(),
            end_time: appointmentEndTime.toISOString(),
            price: price,
            is_first_consult: isFirstConsult,
            status: 'confirmed'
        }).select().single();

        if (insertError || !newAppointment) {
            alert(`Failed to book appointment: ${insertError?.message}`);
            setIsBooking(false);
            return;
        }

        // Step 2: Call your new API route to create the Google Meet link
        try {
            const response = await fetch('/api/create-meeting', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    appointmentId: newAppointment.id,
                    professionalProfileId: professional.id,
                    clientEmail: user.email,
                    startTime: appointmentStartTime.toISOString(),
                    endTime: appointmentEndTime.toISOString(),
                }),
            });

            if (!response.ok) {
                const errorBody = await response.json();
                throw new Error(errorBody.error || 'Failed to create meeting link on the server.');
            }

            onBookingSuccess({ start_time: newAppointment.start_time });
            setBookingSuccessData({ time: appointmentStartTime });

        } catch (apiError: any) {
            console.error(apiError);
            alert(`Appointment was booked, but failed to create a meeting link: ${apiError.message}`);
        }

        setIsBooking(false);
    };

    if (bookingSuccessData) {
        return <SuccessModal onClose={onClose} professionalName={professional.full_name} appointmentTime={bookingSuccessData.time} />;
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-8 max-w-2xl w-full shadow-lg text-gray-800">
                {/* ... Modal content ... */}
            </div>
        </div>
    );
};

// --- MAIN PROFILE PAGE COMPONENT ---
export default function ProfessionalProfileClient({ professionalId }: { professionalId: string }) {
    const supabase = createClientComponentClient();
    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState<ProfessionalProfile | null>(null);
    const [reviews, setReviews] = useState<Review[]>([]);
    const [availability, setAvailability] = useState<Availability[]>([]);
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [activeTab, setActiveTab] = useState('reviews');
    const [showBookingModal, setShowBookingModal] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            const profilePromise = supabase.from('profiles').select('id, full_name, bio, specialties, role, interests, hourly_rate').eq('id', professionalId).single();
            const reviewsPromise = supabase.from('reviews').select('id, rating, content, created_at, client:client_id(full_name)').eq('professional_id', professionalId);
            const availabilityPromise = supabase.from('availability').select('day_of_week, start_time, end_time').eq('professional_id', professionalId);
            const appointmentsPromise = supabase.from('appointments').select('start_time').eq('professional_id', professionalId).gte('start_time', new Date().toISOString());
            const [{ data: profileData }, { data: reviewData }, { data: availabilityData }, { data: appointmentData }] = await Promise.all([profilePromise, reviewsPromise, availabilityPromise, appointmentsPromise]);
            setProfile(profileData);
            setReviews((reviewData as unknown as Review[]) || []);
            setAvailability(availabilityData || []);
            setAppointments(appointmentData || []);
            setLoading(false);
        };
        fetchData().catch(console.error);
    }, [supabase, professionalId]);

    const handleBookingSuccess = (newAppointment: Appointment) => {
        setAppointments([...appointments, newAppointment]);
    };

    const averageRating = reviews.length > 0 ? (reviews.reduce((acc, review) => acc + review.rating, 0) / reviews.length).toFixed(1) : 'N/A';
    if (loading) return <div className="text-center p-8 text-gray-500">Loading Profile...</div>;
    if (!profile) return <div className="text-center p-8 text-gray-500">Professional not found.</div>;

    return (
        <>
            <div className="max-w-5xl mx-auto text-gray-800">
                <div className="bg-white border border-gray-200 rounded-2xl shadow-sm mb-8">
                    <div className="h-40 bg-gray-200 rounded-t-2xl"></div>
                    <div className="p-6">
                        <div className="flex items-end -mt-20">
                            <div className="w-32 h-32 rounded-full bg-gray-300 border-4 border-white flex-shrink-0"></div>
                            <div className="ml-6 flex-grow">
                                <h1 className="text-3xl font-bold">{profile.full_name}</h1>
                                <p className="text-gray-600 capitalize">{profile.role}</p>
                                {profile.hourly_rate !== null && (<div className="flex items-center text-lg font-semibold text-gray-800 mt-2"><span className="text-gray-600 font-bold mr-1">₹</span>{profile.hourly_rate === 0 ? 'Free Consultation' : `${profile.hourly_rate} / hour`}</div>)}
                            </div>
                            <div className="flex gap-4">
                                <button className="bg-white border border-gray-300 text-gray-800 font-bold py-2 px-4 rounded-lg hover:bg-gray-50">
                                    <MessageSquare size={20} className="inline-block mr-2" /> Chat
                                </button>
                                <button onClick={() => setShowBookingModal(true)} className="bg-gray-800 text-white font-bold py-2 px-4 rounded-lg hover:bg-gray-700">
                                    Book Appointment
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-white border border-gray-200 rounded-2xl p-6">
                            <h3 className="text-lg font-bold mb-4">Speciality</h3>
                            <div className="flex flex-wrap gap-2">
                                {profile.specialties?.map(spec => (<span key={spec} className="bg-gray-100 text-gray-700 text-sm px-3 py-1 rounded-full">{spec}</span>)) || <p className="text-gray-500">No specialties listed.</p>}
                            </div>
                        </div>
                        <div className="bg-white border border-gray-200 rounded-2xl p-6">
                            <h3 className="text-lg font-bold mb-4">Interested In</h3>
                            <div className="flex flex-wrap gap-2">
                                {profile.interests?.map(interest => (<span key={interest} className="bg-gray-100 text-gray-700 text-sm px-3 py-1 rounded-full">{interest}</span>)) || <p className="text-gray-500">No interests listed.</p>}
                            </div>
                        </div>
                    </div>

                    <div className="lg:col-span-2">
                        <div className="bg-white border border-gray-200 rounded-2xl">
                            <div className="flex border-b border-gray-200">
                                <button onClick={() => setActiveTab('reviews')} className={`py-4 px-6 font-semibold ${activeTab === 'reviews' ? 'border-b-2 border-gray-800 text-gray-800' : 'text-gray-500'}`}>Reviews</button>
                                <button onClick={() => setActiveTab('about')} className={`py-4 px-6 font-semibold ${activeTab === 'about' ? 'border-b-2 border-gray-800 text-gray-800' : 'text-gray-500'}`}>About Me</button>
                            </div>
                            <div className="p-6">
                                {activeTab === 'reviews' && (
                                    <div>
                                        <div className="flex items-center mb-4">
                                            <h3 className="text-xl font-bold">{averageRating}/5</h3>
                                            <div className="flex items-center gap-1 text-yellow-400 ml-2">
                                                {[...Array(5)].map((_, i) => (<Star key={i} size={20} fill={i < Math.round(parseFloat(averageRating)) ? 'currentColor' : 'none'} stroke="currentColor"/>))}
                                            </div>
                                        </div>
                                        <div className="space-y-6">
                                            {reviews.length > 0 ? (
                                                reviews.map(review => (
                                                    <div key={review.id} className="border-t border-gray-200 pt-4">
                                                        <div className="flex items-center mb-2">
                                                            <div className="w-10 h-10 rounded-full bg-gray-200 mr-4"></div>
                                                            <div>
                                                                <p className="font-semibold">{review.client.full_name}</p>
                                                                <p className="text-sm text-gray-500">{format(new Date(review.created_at), 'dd MMMM yyyy')}</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-1 text-yellow-400 mb-2">
                                                            {[...Array(5)].map((_, i) => (<Star key={i} size={16} fill={i < review.rating ? 'currentColor' : 'none'} stroke="currentColor"/>))}
                                                        </div>
                                                        <p className="text-gray-600">{review.content}</p>
                                                    </div>
                                                ))
                                            ) : (
                                                <p className="text-gray-500">This coach has no reviews yet.</p>
                                            )}
                                        </div>
                                    </div>
                                )}
                                {activeTab === 'about' && (
                                    <div>
                                        <p className="text-gray-600 whitespace-pre-wrap">{profile.bio || "This coach has not written a bio yet."}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {showBookingModal && (
                <BookingModal
                    professional={profile}
                    availability={availability}
                    existingAppointments={appointments}
                    onClose={() => setShowBookingModal(false)}
                    onBookingSuccess={handleBookingSuccess}
                />
            )}
        </>
    );
}
