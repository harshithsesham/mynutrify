// frontend/src/app/dashboard/nutritionist/assigned-clients/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Calendar, User, FileText, MessageSquare, TrendingUp, AlertCircle, Clock, CheckCircle, Loader2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import Link from 'next/link';

type AssignedClient = {
    id: string;
    client_id: string;
    client: {
        id: string;
        full_name: string;
        email: string;
        user_id: string; // <-- ADDED THIS FOR TYPE SAFETY
        age: number;
        gender: string;
    };
    assigned_at: string;
    assignment_reason: string;
    next_appointment?: {
        start_time: string;
    };
    sessions_count: number;
    last_session_date?: string;
};

export default function AssignedClientsPage() {
    const supabase = createClientComponentClient();
    const [loading, setLoading] = useState(true);
    const [clients, setClients] = useState<AssignedClient[]>([]);
    const [selectedClient, setSelectedClient] = useState<AssignedClient | null>(null);
    const [showScheduler, setShowScheduler] = useState(false);

    const fetchAssignedClients = useCallback(async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: profile } = await supabase
                .from('profiles')
                .select('id')
                .eq('user_id', user.id)
                .single();

            if (!profile) return;

            // Get assigned clients with their details
            const { data: assignments } = await supabase
                .from('nutritionist_assignments')
                .select(`
                    id,
                    client_id,
                    assigned_at,
                    assignment_reason,
                    client:client_id(
                        id,
                        full_name,
                        user_id,
                        email 
                    )
                `)
                .eq('nutritionist_id', profile.id)
                .eq('status', 'active');

            if (assignments) {
                // Get additional client info and appointment data
                const clientsWithDetails = await Promise.all(
                    assignments.map(async (assignment) => {
                        // Handle case where client data comes as array from Supabase join
                        const clientData = Array.isArray(assignment.client)
                            ? assignment.client[0]
                            : assignment.client;

                        if (!clientData) {
                            console.warn('No client data found for assignment:', assignment.id);
                            return null;
                        }

                        // Get appointment stats
                        const { data: appointments } = await supabase
                            .from('appointments')
                            .select('start_time')
                            .eq('client_id', assignment.client_id)
                            .eq('professional_id', profile.id)
                            .order('start_time', { ascending: false });

                        const now = new Date();
                        const upcomingAppointments = appointments?.filter(
                            apt => new Date(apt.start_time) > now
                        ) || [];
                        const pastAppointments = appointments?.filter(
                            apt => new Date(apt.start_time) <= now
                        ) || [];

                        return {
                            ...assignment,
                            client: {
                                id: clientData.id,
                                full_name: clientData.full_name,
                                user_id: clientData.user_id, // Ensure user_id is passed through
                                email: clientData.email || '',
                                age: 0,
                                gender: ''
                            },
                            next_appointment: upcomingAppointments[0],
                            sessions_count: appointments?.length || 0,
                            last_session_date: pastAppointments[0]?.start_time
                        };
                    })
                );

                // Filter out any null entries
                const validClients = clientsWithDetails.filter(client => client !== null) as AssignedClient[];
                setClients(validClients);
            }
        } catch (error) {
            console.error('Error fetching clients:', error);
        } finally {
            setLoading(false);
        }
    }, [supabase]);

    useEffect(() => {
        fetchAssignedClients();
    }, [fetchAssignedClients]);

    const ClientScheduler = ({ client, onClose }: {
        client: AssignedClient;
        onClose: () => void
    }) => {
        const [selectedDate, setSelectedDate] = useState('');
        const [selectedTime, setSelectedTime] = useState('');
        const [duration, setDuration] = useState('60');
        const [sessionType, setSessionType] = useState('follow-up');
        const [sessionNotes, setSessionNotes] = useState('');
        const [isScheduling, setIsScheduling] = useState(false);

        const handleScheduleSession = async () => {
            setIsScheduling(true);

            try {
                const response = await fetch('/api/nutritionist/schedule-session', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        clientId: client.client_id,
                        startTime: `${selectedDate}T${selectedTime}`,
                        duration: parseInt(duration),
                        sessionType,
                        sessionNotes
                    })
                });

                if (response.ok) {
                    const result = await response.json();
                    console.log('Scheduling result:', result);
                    alert('Session scheduled successfully! Client has been notified.');
                    onClose();
                    fetchAssignedClients();
                } else {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Failed to schedule session');
                }
            } catch (error) {
                console.error('Error scheduling session:', error);
                alert(`Error scheduling session: ${error instanceof Error ? error.message : 'Please try again.'}`);
            } finally {
                setIsScheduling(false);
            }
        };

        // Generate time slots for 24/7 availability (since no availability checks)
        const generateTimeSlots = () => {
            const slots = [];
            for (let hour = 0; hour < 24; hour++) {
                slots.push(`${hour.toString().padStart(2, '0')}:00`);
                slots.push(`${hour.toString().padStart(2, '0')}:30`);
            }
            return slots;
        };

        return (
            // Modernized Modal Overlay
            <div className="fixed inset-0 bg-gray-900 bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                <div className="bg-white rounded-xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
                    <h2 className="text-3xl font-extrabold mb-6 text-gray-900">
                        Schedule Session for <span className="text-teal-600">{client.client.full_name}</span>
                    </h2>

                    {/* Notice updated with Teal accent */}
                    <div className="bg-teal-50 border border-teal-200 rounded-lg p-4 mb-6">
                        <div className="flex items-center gap-2">
                            <Clock size={20} className="text-teal-600" />
                            <div>
                                <h4 className="font-semibold text-teal-800">Flexible Scheduling</h4>
                                <p className="text-sm text-teal-700">
                                    All scheduling is done in India Standard Time (IST) for consistency.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Session Type */}
                        <div>
                            <label className="block font-medium mb-2 text-gray-700">Session Type</label>
                            <select
                                value={sessionType}
                                onChange={(e) => setSessionType(e.target.value)}
                                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-gray-900 bg-gray-50"
                            >
                                <option value="initial">Initial Assessment</option>
                                <option value="follow-up">Follow-up Session</option>
                                <option value="progress-review">Progress Review</option>
                                <option value="plan-adjustment">Plan Adjustment</option>
                                <option value="emergency">Emergency Consultation</option>
                                <option value="check-in">Quick Check-in</option>
                                <option value="meal-planning">Meal Planning Session</option>
                                <option value="goal-setting">Goal Setting</option>
                            </select>
                        </div>

                        {/* Duration */}
                        <div>
                            <label className="block font-medium mb-2 text-gray-700">Duration</label>
                            <select
                                value={duration}
                                onChange={(e) => setDuration(e.target.value)}
                                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-gray-900 bg-gray-50"
                            >
                                <option value="15">15 minutes</option>
                                <option value="30">30 minutes</option>
                                <option value="45">45 minutes</option>
                                <option value="60">1 hour</option>
                                <option value="90">1.5 hours</option>
                                <option value="120">2 hours</option>
                            </select>
                        </div>

                        {/* Date Selection */}
                        <div>
                            <label className="block font-medium mb-2 text-gray-700">Select Date</label>
                            <input
                                type="date"
                                value={selectedDate}
                                min={new Date().toISOString().split('T')[0]}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-gray-900 bg-gray-50"
                            />
                        </div>

                        {/* Time Selection */}
                        <div>
                            <label className="block font-medium mb-2 text-gray-700">Select Time</label>
                            <select
                                value={selectedTime}
                                onChange={(e) => setSelectedTime(e.target.value)}
                                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-gray-900 bg-gray-50"
                            >
                                <option value="">Choose time...</option>
                                {generateTimeSlots().map(slot => {
                                    const [hour, minute] = slot.split(':');
                                    const hour12 = parseInt(hour) === 0 ? 12 : parseInt(hour) > 12 ? parseInt(hour) - 12 : parseInt(hour);
                                    const ampm = parseInt(hour) >= 12 ? 'PM' : 'AM';
                                    const displayTime = `${hour12}:${minute} ${ampm}`;

                                    return (
                                        <option key={slot} value={slot}>
                                            {displayTime} (IST)
                                        </option>
                                    );
                                })}
                            </select>
                            <p className="text-xs text-gray-500 mt-1">🇮🇳 India Standard Time (IST)</p>
                        </div>

                    </div>

                    {/* Session Notes */}
                    <div className="mt-6">
                        <label className="block font-medium mb-3 text-gray-700">
                            Session Agenda/Notes for Client
                        </label>
                        <textarea
                            value={sessionNotes}
                            onChange={(e) => setSessionNotes(e.target.value)}
                            rows={4}
                            placeholder="What will be covered in this session... (This note will be sent to the client)"
                            className="w-full p-4 border rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-gray-900 bg-gray-50 resize-none"
                        />
                    </div>

                    {/* Client History Summary */}
                    <div className="bg-gray-100 p-4 rounded-xl border border-gray-200 mt-6">
                        <h4 className="font-bold mb-2 text-gray-800 flex items-center gap-2">
                            <User size={18} className="text-teal-600" />
                            Client Summary
                        </h4>
                        <div className="text-sm text-gray-700 space-y-1">
                            <p><strong>Sessions Completed:</strong> <span className="font-semibold text-teal-700">{client.sessions_count}</span></p>
                            {client.last_session_date && (
                                <p><strong>Last Session:</strong> {format(parseISO(client.last_session_date), 'MMM dd, yyyy')}</p>
                            )}
                            <p><strong>Assignment Reason:</strong> {client.assignment_reason}</p>
                            <p><strong>Email:</strong> {client.client.email}</p>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-4 mt-8">
                        <button
                            onClick={handleScheduleSession}
                            disabled={!selectedDate || !selectedTime || isScheduling}
                            className="flex-1 bg-teal-600 text-white font-bold py-3 rounded-full hover:bg-teal-700 disabled:bg-gray-400 transition-colors shadow-lg flex items-center justify-center gap-2"
                        >
                            {isScheduling ? <Loader2 size={20} className="animate-spin" /> : <Calendar size={20} />}
                            {isScheduling ? 'Scheduling...' : 'Schedule Session'}
                        </button>
                        <button
                            onClick={onClose}
                            className="flex-1 bg-gray-200 text-gray-800 font-bold py-3 rounded-full hover:bg-gray-300 transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="animate-spin text-teal-600" size={32} />
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto px-0 py-8">
            <div className="mb-8">
                <h1 className="text-4xl font-extrabold mb-2 text-gray-900">My Assigned Clients</h1>
                <p className="text-gray-600">Overview of all active clients assigned to you for consultation and planning.</p>
            </div>

            {clients.length === 0 ? (
                <div className="bg-white border border-gray-200 rounded-xl p-12 text-center shadow-lg">
                    <User size={64} className="mx-auto text-teal-500 mb-4" />
                    <h2 className="text-2xl font-bold mb-2 text-gray-800">No Assigned Clients Yet</h2>
                    <p className="text-gray-600 max-w-md mx-auto">
                        Your assigned clients will appear here once they are matched with you by a health coach.
                    </p>
                </div>
            ) : (
                <div className="grid gap-6">
                    {clients.map(client => (
                        <div key={client.id} className="bg-white rounded-xl border border-gray-200 shadow-lg hover:shadow-xl transition-shadow duration-300 p-6">
                            <div className="flex items-start justify-between flex-wrap">
                                <div className="flex-1 min-w-0">
                                    {/* Client Header Info */}
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="w-14 h-14 bg-teal-50 rounded-full flex items-center justify-center flex-shrink-0">
                                            <User size={28} className="text-teal-600" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold text-gray-900">
                                                {client.client.full_name}
                                            </h3>
                                            <p className="text-sm text-gray-600 font-medium">
                                                {client.client.email}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Stats Grid */}
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-700 mb-4 bg-gray-50 p-4 rounded-lg">
                                        <div className="flex flex-col">
                                            <span className="font-semibold text-xs uppercase text-teal-600">Assigned</span>
                                            <span className="text-base">{format(parseISO(client.assigned_at), 'MMM dd, yyyy')}</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="font-semibold text-xs uppercase text-teal-600">Sessions</span>
                                            <span className="text-base font-bold">{client.sessions_count}</span>
                                        </div>
                                        {client.last_session_date && (
                                            <div className="flex flex-col">
                                                <span className="font-semibold text-xs uppercase text-teal-600">Last Session</span>
                                                <span className="text-base">{format(parseISO(client.last_session_date), 'MMM dd')}</span>
                                            </div>
                                        )}
                                        <div className="flex flex-col">
                                            <span className="font-semibold text-xs uppercase text-teal-600">Status</span>
                                            <span className="text-base text-green-600 font-bold flex items-center gap-1">
                                                <CheckCircle size={14} /> Active
                                            </span>
                                        </div>
                                    </div>

                                    {/* Next Appointment/Warning */}
                                    {client.next_appointment ? (
                                        <div className="bg-teal-50 border border-teal-200 rounded-lg p-3 mb-4">
                                            <p className="text-sm font-semibold text-teal-800 flex items-center gap-2">
                                                <Calendar size={16} />
                                                Next Session: {format(parseISO(client.next_appointment.start_time), 'MMM dd, h:mm a')} IST
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4">
                                            <div className="flex items-center gap-2">
                                                <AlertCircle size={16} className="text-orange-600" />
                                                <p className="text-sm font-medium text-orange-800">
                                                    No upcoming session scheduled.
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Action Buttons */}
                                    <div className="flex flex-wrap gap-3 mt-4">
                                        <button
                                            onClick={() => {
                                                setSelectedClient(client);
                                                setShowScheduler(true);
                                            }}
                                            className="bg-teal-600 text-white px-5 py-2.5 rounded-full hover:bg-teal-700 flex items-center gap-2 font-semibold transition-colors shadow-md"
                                        >
                                            <Calendar size={16} />
                                            Schedule Session
                                        </button>

                                        <Link
                                            href={`/dashboard/my-clients/${client.client_id}/plans`}
                                            className="bg-gray-200 text-gray-800 px-5 py-2.5 rounded-full hover:bg-gray-300 flex items-center gap-2 font-medium transition-colors"
                                        >
                                            <FileText size={16} />
                                            Plans
                                        </Link>

                                        <Link
                                            href={`/dashboard/clients/${client.client_id}/progress`}
                                            className="bg-gray-200 text-gray-800 px-5 py-2.5 rounded-full hover:bg-gray-300 flex items-center gap-2 font-medium transition-colors"
                                        >
                                            <TrendingUp size={16} />
                                            Progress
                                        </Link>

                                        <Link
                                            href={`/dashboard/messages?to=${client.client_id}`}
                                            className="bg-gray-200 text-gray-800 px-5 py-2.5 rounded-full hover:bg-gray-300 flex items-center gap-2 font-medium transition-colors"
                                        >
                                            <MessageSquare size={16} />
                                            Message
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showScheduler && selectedClient && (
                <ClientScheduler
                    client={selectedClient}
                    onClose={() => {
                        setShowScheduler(false);
                        setSelectedClient(null);
                    }}
                />
            )}
        </div>
    );
}