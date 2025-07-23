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
        <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-sm w-full shadow-lg text-center">
            <CheckCircle size={56} className="text-green-500 mx-auto mb-4" />
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">Appointment Booked!</h2>
            <p className="text-sm sm:text-base text-gray-600">
                A Google Meet link has been created and will be available in your &quot;My Appointments&quot; section.
            </p>
            <button onClick={onClose} className="mt-6 w-full bg-gray-800 text-white font-bold py-3 px-4 rounded-lg hover:bg-gray-700">
                Done
            </button>
        </div>
    </div>
);

// --- NEW BOOKING MODAL ---
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
        const { data: newAppointment, error: insertError } = await supabase.from('appointments').insert({ client_id: clientProfile.id, professional_id: professional.id, start_time: appointmentStartTime.toISOString(), end_time: appointmentEndTime.toISOString(), price: price, is_first_consult: isFirstConsult, status: 'confirmed' }).select().single();
        if (insertError || !newAppointment) {
            alert(`Failed to book appointment: ${insertError?.message}`);
            setIsBooking(false);
            return;
        }
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
        } catch (apiError) {
            console.error(apiError);
            const message = apiError instanceof Error ? apiError.message : 'An unknown error occurred.';
            alert(`Appointment was booked, but failed to create a meeting link: ${message}`);
        }
        setIsBooking(false);
    };

    if (bookingSuccessData) {
        return <SuccessModal onClose={onClose} professionalName={professional.full_name} appointmentTime={bookingSuccessData.time} />;
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-4 sm:p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-lg text-gray-800">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl sm:text-2xl font-bold">Book Appointment</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={24}/></button>
                </div>
                <div className="space-y-6 sm:grid sm:grid-cols-2 sm:gap-8 sm:space-y-0">
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2 rounded-full hover:bg-gray-100"><ChevronLeft size={20}/></button>
                            <h3 className="text-base sm:text-lg font-semibold">{format(currentMonth, 'MMMM yyyy')}</h3>
                            <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2 rounded-full hover:bg-gray-100"><ChevronRight size={20}/></button>
                        </div>
                        <div className="grid grid-cols-7 gap-1 text-center text-xs sm:text-sm text-gray-500 mb-2">
                            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => <div key={day} className="py-1">{day}</div>)}
                        </div>
                        <div className="grid grid-cols-7 gap-1">
                            {calendarData.daysInMonth.map((day: Date) => {
                                const isAvailable = calendarData.availableDaysInMonth.has(format(day, 'yyyy-MM-dd'));
                                const isSelected = selectedDate && isSameDay(day, selectedDate);
                                const isPast = isBefore(day, calendarData.today);
                                const isCurrentMonth = format(day, 'M') === format(currentMonth, 'M');
                                return (
                                    <button key={day.toString()} onClick={() => { setSelectedDate(day); setSelectedSlot(null); }} disabled={!isAvailable || isPast}
                                            className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full transition-colors text-xs sm:text-sm ${isPast ? 'text-gray-300' : ''} ${!isCurrentMonth ? 'text-gray-400' : ''} ${isSelected ? 'bg-gray-800 text-white' : ''} ${isAvailable && !isSelected && !isPast ? 'bg-green-100 text-green-800 hover:bg-green-200' : ''} ${!isAvailable && !isPast ? 'text-gray-500 cursor-not-allowed' : ''}`}>
                                        {format(day, 'd')}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                    <div className="border-t sm:border-t-0 sm:border-l border-gray-200 sm:pl-8 pt-6 sm:pt-0">
                        <h4 className="font-semibold mb-4 text-center flex items-center justify-center gap-2"><Clock size={18}/> Available Slots</h4>
                        {selectedDate ? (
                            <div className="grid grid-cols-2 gap-2 sm:gap-4">
                                {availableTimeSlots.length > 0 ? (
                                    availableTimeSlots.map(time => (
                                        <button key={time} onClick={() => setSelectedSlot(time)} className={`font-semibold py-2 sm:py-3 px-2 rounded-lg transition duration-300 text-center text-sm sm:text-base ${selectedSlot === time ? 'bg-gray-800 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}>
                                            {time}
                                        </button>
                                    ))
                                ) : (
                                    <p className="text-gray-500 col-span-full text-center py-4 text-sm">No available slots for this day.</p>
                                )}
                            </div>
                        ) : (
                            <p className="text-gray-500 text-center py-4 text-sm">Please select a date from the calendar.</p>
                        )}
                        {selectedSlot && (
                            <div className="mt-6 text-center">
                                <button onClick={handleConfirmBooking} disabled={isBooking} className="w-full bg-gray-800 hover:bg-gray-700 text-white font-bold py-3 px-6 rounded-lg disabled:bg-gray-500">
                                    {isBooking ? 'Booking...' : 'Confirm'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
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
            <div className="max-w-5xl mx-auto text-gray-800 px-4 sm:px-6">
                {/* Profile Header Card */}
                <div className="bg-white border border-gray-200 rounded-2xl shadow-sm mb-6">
                    {/* Cover Photo */}
                    <div className="h-24 sm:h-40 bg-gray-200 rounded-t-2xl"></div>

                    {/* Profile Content */}
                    <div className="p-4 sm:p-6">
                        {/* Mobile Layout */}
                        <div className="sm:hidden">
                            {/* Profile Image & Basic Info */}
                            <div className="flex items-start -mt-16 mb-4">
                                <div className="w-20 h-20 rounded-full bg-gray-300 border-4 border-white flex-shrink-0"></div>
                                <div className="ml-4 flex-grow">
                                    <h1 className="text-xl font-bold leading-tight">{profile.full_name}</h1>
                                    <p className="text-gray-600 capitalize text-sm">{profile.role}</p>
                                    {profile.hourly_rate !== null && (
                                        <div className="flex items-center text-sm font-semibold text-gray-800 mt-1">
                                            <span className="text-gray-600 font-bold mr-1">₹</span>
                                            {profile.hourly_rate === 0 ? 'Free Consultation' : `${profile.hourly_rate} / hour`}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-3">
                                <button className="flex-1 bg-white border border-gray-300 text-gray-800 font-medium py-2.5 px-4 rounded-lg hover:bg-gray-50 text-sm">
                                    <MessageSquare size={16} className="inline-block mr-2" /> Chat
                                </button>
                                <button onClick={() => setShowBookingModal(true)} className="flex-1 bg-gray-800 text-white font-medium py-2.5 px-4 rounded-lg hover:bg-gray-700 text-sm">
                                    Book Appointment
                                </button>
                            </div>
                        </div>

                        {/* Desktop Layout */}
                        <div className="hidden sm:block">
                            <div className="flex items-end -mt-20">
                                <div className="w-32 h-32 rounded-full bg-gray-300 border-4 border-white flex-shrink-0"></div>
                                <div className="ml-6 flex-grow">
                                    <h1 className="text-3xl font-bold">{profile.full_name}</h1>
                                    <p className="text-gray-600 capitalize">{profile.role}</p>
                                    {profile.hourly_rate !== null && (
                                        <div className="flex items-center text-lg font-semibold text-gray-800 mt-2">
                                            <span className="text-gray-600 font-bold mr-1">₹</span>
                                            {profile.hourly_rate === 0 ? 'Free Consultation' : `${profile.hourly_rate} / hour`}
                                        </div>
                                    )}
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
                </div>

                {/* Content Grid */}
                <div className="space-y-6 lg:grid lg:grid-cols-3 lg:gap-8 lg:space-y-0">
                    {/* Sidebar */}
                    <div className="lg:col-span-1 space-y-6">
                        {/* Specialties */}
                        <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-6">
                            <h3 className="text-lg font-bold mb-4">Speciality</h3>
                            <div className="flex flex-wrap gap-2">
                                {profile.specialties?.map(spec => (
                                    <span key={spec} className="bg-gray-100 text-gray-700 text-sm px-3 py-1 rounded-full">
                                        {spec}
                                    </span>
                                )) || <p className="text-gray-500 text-sm">No specialties listed.</p>}
                            </div>
                        </div>

                        {/* Interests */}
                        <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-6">
                            <h3 className="text-lg font-bold mb-4">Interested In</h3>
                            <div className="flex flex-wrap gap-2">
                                {profile.interests?.map(interest => (
                                    <span key={interest} className="bg-gray-100 text-gray-700 text-sm px-3 py-1 rounded-full">
                                        {interest}
                                    </span>
                                )) || <p className="text-gray-500 text-sm">No interests listed.</p>}
                            </div>
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="lg:col-span-2">
                        <div className="bg-white border border-gray-200 rounded-2xl">
                            {/* Tab Navigation */}
                            <div className="flex border-b border-gray-200">
                                <button
                                    onClick={() => setActiveTab('reviews')}
                                    className={`py-4 px-4 sm:px-6 font-semibold text-sm sm:text-base ${
                                        activeTab === 'reviews'
                                            ? 'border-b-2 border-gray-800 text-gray-800'
                                            : 'text-gray-500'
                                    }`}
                                >
                                    Reviews
                                </button>
                                <button
                                    onClick={() => setActiveTab('about')}
                                    className={`py-4 px-4 sm:px-6 font-semibold text-sm sm:text-base ${
                                        activeTab === 'about'
                                            ? 'border-b-2 border-gray-800 text-gray-800'
                                            : 'text-gray-500'
                                    }`}
                                >
                                    About Me
                                </button>
                            </div>

                            {/* Tab Content */}
                            <div className="p-4 sm:p-6">
                                {activeTab === 'reviews' && (
                                    <div>
                                        {/* Rating Summary */}
                                        <div className="flex items-center mb-6">
                                            <h3 className="text-xl sm:text-2xl font-bold">{averageRating}/5</h3>
                                            <div className="flex items-center gap-1 text-yellow-400 ml-2">
                                                {[...Array(5)].map((_, i) => (
                                                    <Star
                                                        key={i}
                                                        size={20}
                                                        fill={i < Math.round(parseFloat(averageRating)) ? 'currentColor' : 'none'}
                                                        stroke="currentColor"
                                                    />
                                                ))}
                                            </div>
                                        </div>

                                        {/* Reviews List */}
                                        <div className="space-y-6">
                                            {reviews.length > 0 ? (
                                                reviews.map(review => (
                                                    <div key={review.id} className="border-t border-gray-200 pt-4 first:border-t-0 first:pt-0">
                                                        <div className="flex items-center mb-3">
                                                            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gray-200 mr-3 sm:mr-4"></div>
                                                            <div>
                                                                <p className="font-semibold text-sm sm:text-base">{review.client.full_name}</p>
                                                                <p className="text-xs sm:text-sm text-gray-500">{format(new Date(review.created_at), 'dd MMMM yyyy')}</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-1 text-yellow-400 mb-2">
                                                            {[...Array(5)].map((_, i) => (
                                                                <Star
                                                                    key={i}
                                                                    size={14}
                                                                    fill={i < review.rating ? 'currentColor' : 'none'}
                                                                    stroke="currentColor"
                                                                />
                                                            ))}
                                                        </div>
                                                        <p className="text-gray-600 text-sm sm:text-base">{review.content}</p>
                                                    </div>
                                                ))
                                            ) : (
                                                <p className="text-gray-500 text-center py-8 text-sm sm:text-base">This coach has no reviews yet.</p>
                                            )}
                                        </div>
                                    </div>
                                )}
                                {activeTab === 'about' && (
                                    <div>
                                        <p className="text-gray-600 whitespace-pre-wrap text-sm sm:text-base leading-relaxed">
                                            {profile.bio || "This coach has not written a bio yet."}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Booking Modal */}
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
