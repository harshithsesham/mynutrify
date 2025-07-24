// app/dashboard/professionals/[id]/ProfessionalProfileClient.tsx
'use client';

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useEffect, useState, useMemo, FC } from 'react';
import { Star, MessageSquare, Clock, ChevronLeft, ChevronRight, X, CheckCircle, AlertCircle, Calendar } from 'lucide-react';
import { format, addMonths, subMonths, getDay, parseISO, set, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isBefore, startOfToday, startOfWeek, endOfWeek, addHours, isAfter } from 'date-fns';
import { useRouter } from 'next/navigation';

// --- TYPE DEFINITIONS ---
type ProfessionalProfile = {
    id: string;
    full_name: string;
    bio: string | null;
    specialties: string[] | null;
    role: 'nutritionist' | 'trainer';
    interests: string[] | null;
    hourly_rate: number | null;
};

type Availability = {
    day_of_week: number;
    start_time: string;
    end_time: string;
};

type Appointment = {
    start_time: string;
    end_time: string;
};

type Review = {
    id: number;
    rating: number;
    content: string;
    created_at: string;
    client: { full_name: string };
};

// --- ENHANCED SUCCESS MODAL (FIXED) ---
const SuccessModal: FC<{
    onClose: () => void;
    professionalName: string;
    appointmentTime: Date;
    isFirstConsult: boolean;
    hourlyRate?: number | null;
    onFinalClose: () => void;
}> = ({ onClose, professionalName, appointmentTime, isFirstConsult, hourlyRate, onFinalClose }) => {
    const router = useRouter();

    // Optional: Play success sound
    useEffect(() => {
        try {
            const audio = new Audio('/sounds/success.mp3');
            audio.volume = 0.3;
            audio.play().catch(() => {}); // Ignore errors if sound fails
        } catch (error) {
            // Ignore sound errors
        }
    }, []);

    const handleViewAppointments = () => {
        onFinalClose(); // Close the booking modal
        router.push('/dashboard/my-appointments');
    };

    const handleContinueBrowsing = () => {
        onFinalClose(); // Close the booking modal
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fadeIn">
            <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl text-center transform animate-slideUp">
                {/* Success Animation */}
                <div className="relative mb-6">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                        <CheckCircle size={48} className="text-green-500" />
                    </div>
                    {/* Celebration Emojis */}
                    <div className="absolute -top-2 -left-2 text-2xl animate-pulse">🎉</div>
                    <div className="absolute -top-2 -right-2 text-2xl animate-pulse delay-200">✨</div>
                </div>

                {/* Success Message */}
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-3">
                    Booking Confirmed!
                </h2>

                <p className="text-gray-600 mb-6">
                    Great news! Your appointment has been successfully booked.
                </p>

                {/* Appointment Details Card */}
                <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left">
                    <h3 className="font-semibold text-gray-800 mb-3 text-center">Appointment Details</h3>

                    <div className="space-y-3">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                <MessageSquare size={16} className="text-blue-600" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Coach</p>
                                <p className="font-medium text-gray-800">{professionalName}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                                <Calendar size={16} className="text-purple-600" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Date & Time</p>
                                <p className="font-medium text-gray-800">
                                    {format(appointmentTime, 'EEEE, MMMM do, yyyy')}
                                </p>
                                <p className="font-medium text-gray-800">
                                    {format(appointmentTime, 'h:mm a')} - {format(addHours(appointmentTime, 1), 'h:mm a')}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                                <CheckCircle size={16} className="text-green-600" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Price</p>
                                <p className="font-medium text-green-600">
                                    {isFirstConsult ? 'FREE (First Consultation)' : `₹${hourlyRate || 0}`}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Special First Consultation Badge */}
                {isFirstConsult && (
                    <div className="bg-gradient-to-r from-green-400 to-blue-500 text-white px-4 py-2 rounded-full text-sm font-medium mb-6 inline-block">
                        🎉 First Consultation - Completely FREE!
                    </div>
                )}

                {/* Next Steps */}
                <div className="bg-blue-50 rounded-lg p-4 mb-6">
                    <h4 className="font-semibold text-blue-800 mb-2">What&apos;s Next?</h4>
                    <div className="text-sm text-blue-700 space-y-1 text-left">
                        <p>✅ Google Meet link has been created</p>
                        <p>✅ Check your &quot;My Appointments&quot; section</p>
                        <p>✅ You&apos;ll receive a confirmation email</p>
                        <p>✅ Join the meeting 5 minutes early</p>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-3">
                    <button
                        onClick={handleViewAppointments}
                        className="w-full bg-gray-800 text-white font-bold py-3 px-6 rounded-lg hover:bg-gray-700 transition-colors transform hover:scale-105"
                    >
                        View My Appointments
                    </button>

                    <button
                        onClick={handleContinueBrowsing}
                        className="w-full bg-gray-100 text-gray-700 font-medium py-2 px-6 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                        Continue Browsing
                    </button>
                </div>

                {/* Appreciation Message */}
                <p className="text-xs text-gray-500 mt-4">
                    Thank you for choosing our platform! We&apos;re excited to help you on your wellness journey. 💪
                </p>
            </div>
        </div>
    );
};

// --- ERROR MODAL ---
const ErrorModal: FC<{
    onClose: () => void;
    title: string;
    message: string;
}> = ({ onClose, title, message }) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fadeIn">
        <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-sm w-full shadow-lg text-center transform animate-slideUp">
            <AlertCircle size={56} className="text-red-500 mx-auto mb-4" />
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">{title}</h2>
            <p className="text-sm sm:text-base text-gray-600 mb-6">{message}</p>
            <button onClick={() => onClose()} className="w-full bg-gray-800 text-white font-bold py-3 px-4 rounded-lg hover:bg-gray-700">
                Try Again
            </button>
        </div>
    </div>
);

// --- IMPROVED BOOKING MODAL (FIXED) ---
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
    const [bookingSuccessData, setBookingSuccessData] = useState<{ time: Date; isFirstConsult: boolean; appointment: Appointment } | null>(null);
    const [error, setError] = useState<{ title: string; message: string } | null>(null);
    const [isLoadingSlots, setIsLoadingSlots] = useState(false);
    const [freshAppointments, setFreshAppointments] = useState<Appointment[]>(existingAppointments);

    // Calculate minimum bookable time (current time + 1 hour)
    const minBookableTime = useMemo(() => addHours(new Date(), 1), []);

    const calendarData = useMemo(() => {
        const today = startOfToday();
        const start = startOfWeek(startOfMonth(currentMonth));
        const end = endOfWeek(endOfMonth(currentMonth));
        const daysInMonth = eachDayOfInterval({ start, end });

        const availableDays = new Set<string>();
        availability.forEach(avail => {
            daysInMonth.forEach(day => {
                if (getDay(day) === avail.day_of_week && !isBefore(day, today)) {
                    // Check if any time slot on this day would be after minBookableTime
                    const dayStart = set(day, { hours: parseInt(avail.start_time.split(':')[0]), minutes: 0, seconds: 0, milliseconds: 0 });
                    const dayEnd = set(day, { hours: parseInt(avail.end_time.split(':')[0]) - 1, minutes: 59, seconds: 59, milliseconds: 999 });

                    if (isAfter(dayEnd, minBookableTime)) {
                        availableDays.add(format(day, 'yyyy-MM-dd'));
                    }
                }
            });
        });
        return { daysInMonth, today, availableDaysInMonth: availableDays, minBookableTime };
    }, [currentMonth, availability, minBookableTime]);

    // FIXED: Fetch fresh appointment data when date is selected
    const refreshAppointments = async (selectedDate: Date) => {
        setIsLoadingSlots(true);
        try {
            const startOfDay = set(selectedDate, { hours: 0, minutes: 0, seconds: 0, milliseconds: 0 });
            const endOfDay = set(selectedDate, { hours: 23, minutes: 59, seconds: 59, milliseconds: 999 });

            console.log('Fetching appointments for:', format(selectedDate, 'yyyy-MM-dd')); // Debug

            const { data: dayAppointments, error } = await supabase
                .from('appointments')
                .select('start_time, end_time')
                .eq('professional_id', professional.id)
                .eq('status', 'confirmed')
                .gte('start_time', startOfDay.toISOString())
                .lte('start_time', endOfDay.toISOString());

            if (error) throw error;

            const appointments = dayAppointments || [];
            console.log('Found appointments:', appointments); // Debug
            console.log('Total confirmed appointments for this day:', appointments.length); // Debug count

            setFreshAppointments(appointments);
            return appointments;
        } catch (error) {
            console.error('Error fetching appointments:', error);
            const dayAppointments = existingAppointments.filter(apt => {
                const aptDate = parseISO(apt.start_time);
                return isSameDay(aptDate, selectedDate);
            });
            setFreshAppointments(dayAppointments);
            return dayAppointments;
        } finally {
            setIsLoadingSlots(false);
        }
    };

    // FIXED: Time slot calculation to properly exclude booked times
    const availableTimeSlots = useMemo(() => {
        if (!selectedDate) return [];

        const dayOfWeek = getDay(selectedDate);
        const dayAvailability = availability.find(a => a.day_of_week === dayOfWeek);
        if (!dayAvailability) return [];

        // Get all booked slots for the selected date
        const bookedSlots = freshAppointments
            .filter(apt => {
                const aptStartTime = parseISO(apt.start_time);
                return isSameDay(aptStartTime, selectedDate);
            })
            .map(apt => {
                const startTime = parseISO(apt.start_time);
                const endTime = parseISO(apt.end_time);

                // Use getHours() instead of format() to get the local hour
                const startHour = startTime.getHours();
                const endHour = endTime.getHours();

                console.log(`Appointment from ${apt.start_time} maps to hours ${startHour}-${endHour}`);

                return {
                    start: startHour,
                    end: endHour
                };
            });

        console.log('Booked slots for date:', format(selectedDate, 'yyyy-MM-dd'), bookedSlots); // Debug
        console.log('Fresh appointments:', freshAppointments); // Debug all appointments

        const slots = [];
        const startTime = parseInt(dayAvailability.start_time.split(':')[0]);
        const endTime = parseInt(dayAvailability.end_time.split(':')[0]);

        for (let hour = startTime; hour < endTime; hour++) {
            const timeSlot = `${String(hour).padStart(2, '0')}:00`;
            const slotDateTime = set(selectedDate, {
                hours: hour,
                minutes: 0,
                seconds: 0,
                milliseconds: 0
            });

            // Check if slot is after minimum bookable time
            if (!isAfter(slotDateTime, calendarData.minBookableTime)) {
                console.log(`Slot ${hour}:00 is before min bookable time, skipping`);
                continue;
            }

            // Check if this hour conflicts with any booked appointment
            const isBooked = bookedSlots.some(booked => {
                // Check if the current hour falls within any booked time range
                return hour >= booked.start && hour < booked.end;
            });

            console.log(`Hour ${hour}:00 - isBooked:`, isBooked); // Debug

            if (!isBooked) {
                slots.push(timeSlot);
            }
        }

        console.log('Available slots:', slots); // Debug
        return slots;
    }, [selectedDate, availability, calendarData.minBookableTime, freshAppointments]);

    // Handle date selection
    const handleDateSelect = async (date: Date) => {
        setSelectedDate(date);
        setSelectedSlot(null);
        await refreshAppointments(date);
    };

    // FIXED: Enhanced booking logic with proper timezone handling
    const handleConfirmBooking = async () => {
        if (!selectedSlot || !selectedDate || !professional) return;

        setIsBooking(true);
        setError(null);

        try {
            // Create the appointment time in local timezone
            const [hours, minutes] = selectedSlot.split(':').map(Number);
            const localStartTime = set(selectedDate, {
                hours,
                minutes,
                seconds: 0,
                milliseconds: 0
            });

            // End time is 1 hour after start time
            const localEndTime = addHours(localStartTime, 1);

            console.log('Local booking time:', format(localStartTime, 'yyyy-MM-dd HH:mm zzz'));
            console.log('UTC booking time:', localStartTime.toISOString());

            // Use server-side booking API for validation and creation
            const response = await fetch('/api/book-appointment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    professionalId: professional.id,
                    startTime: localStartTime.toISOString(),
                    endTime: localEndTime.toISOString(),
                }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to book appointment');
            }

            const { appointment, isFirstConsult } = result;

            // Create Google Meet link
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (user?.email) {
                    const meetingResponse = await fetch('/api/create-meeting', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            appointmentId: appointment.id,
                            professionalProfileId: professional.id,
                            clientEmail: user.email,
                            startTime: appointment.start_time,
                            endTime: appointment.end_time,
                        }),
                    });

                    if (!meetingResponse.ok) {
                        console.error('Meeting creation failed, but appointment was booked');
                    }
                }
            } catch (meetingError) {
                console.error('Meeting creation error:', meetingError);
                // Continue with booking success even if meeting creation fails
            }

            // IMPORTANT FIX: Immediately update the fresh appointments to hide the booked slot
            const newAppointment = {
                start_time: appointment.start_time,
                end_time: appointment.end_time
            };

            // Update local state immediately
            setFreshAppointments(prev => [...prev, newAppointment]);

            // Clear selected slot to prevent rebooking
            setSelectedSlot(null);

            // Set success data with the appointment
            // Parse the UTC time back to local for display
            setBookingSuccessData({
                time: parseISO(appointment.start_time), // This will show in local time
                isFirstConsult,
                appointment: newAppointment
            });

        } catch (error) {
            console.error('Booking error:', error);
            const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
            setError({
                title: "Booking Failed",
                message: errorMessage
            });
        } finally {
            setIsBooking(false);
        }
    };

    // FIXED: Show success modal with proper close handling
    if (bookingSuccessData) {
        return <SuccessModal
            onClose={() => {
                // When closing success modal, stay in booking modal with updated slots
                setBookingSuccessData(null);
                // Refresh appointments for the selected date to ensure UI is up to date
                if (selectedDate) {
                    refreshAppointments(selectedDate);
                }
            }}
            professionalName={professional.full_name}
            appointmentTime={bookingSuccessData.time}
            isFirstConsult={bookingSuccessData.isFirstConsult}
            hourlyRate={professional.hourly_rate}
            onFinalClose={() => {
                // Close everything and update parent
                onBookingSuccess(bookingSuccessData.appointment);
                onClose();
            }}
        />;
    }

    // Show error modal
    if (error) {
        return <ErrorModal
            onClose={() => setError(null)}
            title={error.title}
            message={error.message}
        />;
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-4 sm:p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-lg text-gray-800">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl sm:text-2xl font-bold">Book Appointment</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X size={24}/>
                    </button>
                </div>

                <div className="space-y-6 sm:grid sm:grid-cols-2 sm:gap-8 sm:space-y-0">
                    {/* Calendar Section */}
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <button
                                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                                className="p-2 rounded-full hover:bg-gray-100"
                            >
                                <ChevronLeft size={20}/>
                            </button>
                            <h3 className="text-base sm:text-lg font-semibold">
                                {format(currentMonth, 'MMMM yyyy')}
                            </h3>
                            <button
                                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                                className="p-2 rounded-full hover:bg-gray-100"
                            >
                                <ChevronRight size={20}/>
                            </button>
                        </div>

                        <div className="grid grid-cols-7 gap-1 text-center text-xs sm:text-sm text-gray-500 mb-2">
                            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day =>
                                <div key={day} className="py-1">{day}</div>
                            )}
                        </div>

                        <div className="grid grid-cols-7 gap-1">
                            {calendarData.daysInMonth.map((day: Date) => {
                                const isAvailable = calendarData.availableDaysInMonth.has(format(day, 'yyyy-MM-dd'));
                                const isSelected = selectedDate && isSameDay(day, selectedDate);
                                const isPast = isBefore(day, calendarData.today);
                                const isCurrentMonth = format(day, 'M') === format(currentMonth, 'M');

                                return (
                                    <button
                                        key={day.toString()}
                                        onClick={() => handleDateSelect(day)}
                                        disabled={!isAvailable || isPast}
                                        className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full transition-colors text-xs sm:text-sm ${
                                            isPast ? 'text-gray-300' : ''
                                        } ${
                                            !isCurrentMonth ? 'text-gray-400' : ''
                                        } ${
                                            isSelected ? 'bg-gray-800 text-white' : ''
                                        } ${
                                            isAvailable && !isSelected && !isPast ? 'bg-green-100 text-green-800 hover:bg-green-200' : ''
                                        } ${
                                            !isAvailable && !isPast ? 'text-gray-500 cursor-not-allowed' : ''
                                        }`}
                                    >
                                        {format(day, 'd')}
                                    </button>
                                );
                            })}
                        </div>

                        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                            <h4 className="text-sm font-medium text-blue-800 mb-2">Booking Guidelines:</h4>
                            <ul className="text-xs text-blue-700 space-y-1">
                                <li>• Green dates have available slots</li>
                                <li>• Book at least 1 hour in advance</li>
                                <li>• First consultation is always free</li>
                                <li>• Each session is 1 hour long</li>
                            </ul>
                        </div>
                    </div>

                    {/* Time Slots Section */}
                    <div className="border-t sm:border-t-0 sm:border-l border-gray-200 sm:pl-8 pt-6 sm:pt-0">
                        <h4 className="font-semibold mb-4 text-center flex items-center justify-center gap-2">
                            <Clock size={18}/> Available Slots
                        </h4>

                        {selectedDate ? (
                            <div className="space-y-3">
                                {isLoadingSlots ? (
                                    <div className="text-center py-8">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-800 mx-auto"></div>
                                        <p className="text-sm text-gray-500 mt-2">Loading available slots...</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 gap-2 sm:gap-4">
                                        {availableTimeSlots.length > 0 ? (
                                            availableTimeSlots.map(time => (
                                                <button
                                                    key={time}
                                                    onClick={() => setSelectedSlot(time)}
                                                    className={`font-semibold py-2 sm:py-3 px-2 rounded-lg transition duration-300 text-center text-sm sm:text-base ${
                                                        selectedSlot === time
                                                            ? 'bg-gray-800 text-white'
                                                            : 'bg-gray-100 hover:bg-gray-200'
                                                    }`}
                                                >
                                                    {time}
                                                </button>
                                            ))
                                        ) : (
                                            <div className="col-span-full text-center py-8">
                                                <Clock size={48} className="mx-auto text-gray-300 mb-3" />
                                                <p className="text-gray-500 text-sm mb-2">
                                                    No available slots for this day
                                                </p>
                                                <p className="text-xs text-gray-400">
                                                    Try selecting another date
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="text-center py-8">
                                <Calendar size={48} className="mx-auto text-gray-300 mb-3" />
                                <p className="text-gray-500 text-sm">
                                    Please select a date from the calendar
                                </p>
                            </div>
                        )}

                        {selectedSlot && selectedDate && (
                            <div className="mt-6 space-y-4">
                                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                                    <h5 className="font-medium text-gray-800 mb-3">Booking Summary</h5>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Professional:</span>
                                            <span className="font-medium">{professional.full_name}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Date:</span>
                                            <span className="font-medium">{format(selectedDate, 'MMM dd, yyyy')}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Time:</span>
                                            <span className="font-medium">
                                                {selectedSlot} - {format(set(selectedDate, { hours: parseInt(selectedSlot.split(':')[0]) + 1 }), 'HH:mm')}
                                                <span className="text-xs text-gray-500 ml-1">(local time)</span>
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Duration:</span>
                                            <span className="font-medium">1 hour</span>
                                        </div>
                                        <div className="flex justify-between border-t border-gray-200 pt-2">
                                            <span className="text-gray-600">Price:</span>
                                            <span className="font-bold text-green-600">
                                                First consultation FREE
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={handleConfirmBooking}
                                    disabled={isBooking}
                                    className="w-full bg-gray-800 hover:bg-gray-700 text-white font-bold py-3 px-6 rounded-lg disabled:bg-gray-500 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
                                >
                                    {isBooking ? (
                                        <>
                                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                                            Booking Appointment...
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle size={20} className="mr-2" />
                                            Confirm Booking
                                        </>
                                    )}
                                </button>

                                <p className="text-xs text-gray-500 text-center">
                                    By booking, you agree to our terms of service and cancellation policy.
                                </p>
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
            try {
                const [profileRes, reviewsRes, availabilityRes, appointmentsRes] = await Promise.all([
                    supabase.from('profiles').select('id, full_name, bio, specialties, role, interests, hourly_rate').eq('id', professionalId).single(),
                    supabase.from('reviews').select('id, rating, content, created_at, client:client_id(full_name)').eq('professional_id', professionalId),
                    supabase.from('availability').select('day_of_week, start_time, end_time').eq('professional_id', professionalId),
                    supabase.from('appointments').select('start_time, end_time').eq('professional_id', professionalId).eq('status', 'confirmed').gte('start_time', new Date().toISOString())
                ]);

                setProfile(profileRes.data);
                setReviews((reviewsRes.data as unknown as Review[]) || []);
                setAvailability(availabilityRes.data || []);
                setAppointments(appointmentsRes.data || []);
            } catch (error) {
                console.error('Error fetching data:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [supabase, professionalId]);

    // FIXED: Don't close booking modal immediately
    const handleBookingSuccess = (newAppointment: Appointment) => {
        // Add to appointments list for future bookings
        setAppointments([...appointments, newAppointment]);
        // Don't close modal here - let the success modal handle it
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