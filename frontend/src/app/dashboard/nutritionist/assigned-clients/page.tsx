// app/dashboard/nutritionist/assigned-clients/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Calendar, User, FileText, MessageSquare, TrendingUp, AlertCircle } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import Link from 'next/link';

type AssignedClient = {
    id: string;
    client_id: string;
    client: {
        id: string;
        full_name: string;
        email: string;
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
                        user_id
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

                        // Get client's full profile info
                        const { data: { user: clientUser } } = await supabase.auth.admin.getUserById(
                            clientData.user_id
                        );

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
                                email: clientUser?.email || '',
                                age: 0, // Default value since we don't have this from the query
                                gender: '' // Default value since we don't have this from the query
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
            if (!selectedDate || !selectedTime) {
                alert('Please select both date and time');
                return;
            }

            setIsScheduling(true);

            try {
                // Create local datetime string without timezone info
                // This is what the API expects: "2024-12-20T11:00" (no Z, no timezone offset)
                const localDateTime = `${selectedDate}T${selectedTime}`;

                // Validate the format - ensure it doesn't have timezone info
                if (localDateTime.includes('Z') || localDateTime.includes('+') || localDateTime.includes('-')) {
                    throw new Error('Invalid time format. Local time should not contain timezone information.');
                }

                console.log('Scheduling session for local time:', localDateTime);

                const response = await fetch('/api/nutritionist/schedule-session', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        clientId: client.client_id,
                        startTime: localDateTime, // Send exactly as created - no conversion
                        duration: parseInt(duration),
                        sessionType,
                        sessionNotes
                    })
                });

                const result = await response.json();

                if (response.ok) {
                    alert('Session scheduled successfully! Client has been notified.');
                    onClose();
                    fetchAssignedClients();
                } else {
                    console.error('Scheduling error:', result);
                    alert(result.error || 'Failed to schedule session');
                }
            } catch (error) {
                console.error('Error scheduling session:', error);
                alert('Error scheduling session. Please try again.');
            } finally {
                setIsScheduling(false);
            }
        };

        // Generate time slots based on availability
        const generateTimeSlots = () => {
            const slots = [];
            for (let hour = 9; hour < 18; hour++) {
                slots.push(`${hour.toString().padStart(2, '0')}:00`);
                slots.push(`${hour.toString().padStart(2, '0')}:30`);
            }
            return slots;
        };

        // Format time for display (add AM/PM)
        const formatTimeForDisplay = (time: string) => {
            const [hour, minute] = time.split(':').map(Number);
            const period = hour >= 12 ? 'PM' : 'AM';
            const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
            return `${displayHour}:${minute.toString().padStart(2, '0')} ${period}`;
        };

        // Get tomorrow's date as minimum (to ensure at least 1 hour advance)
        const getMinDate = () => {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            return tomorrow.toISOString().split('T')[0];
        };

        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                    <h2 className="text-2xl font-bold mb-6">
                        Schedule Session for {client.client.full_name}
                    </h2>

                    <div className="space-y-6">
                        {/* Session Type */}
                        <div>
                            <label className="block font-medium mb-2">Session Type</label>
                            <select
                                value={sessionType}
                                onChange={(e) => setSessionType(e.target.value)}
                                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="initial">Initial Assessment</option>
                                <option value="follow-up">Follow-up Session</option>
                                <option value="progress-review">Progress Review</option>
                                <option value="plan-adjustment">Plan Adjustment</option>
                                <option value="emergency">Emergency Consultation</option>
                            </select>
                        </div>

                        {/* Date Selection */}
                        <div>
                            <label className="block font-medium mb-2">Select Date</label>
                            <input
                                type="date"
                                value={selectedDate}
                                min={getMinDate()}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Must be at least 24 hours in advance
                            </p>
                        </div>

                        {/* Time Selection */}
                        <div>
                            <label className="block font-medium mb-2">Select Time (Your Local Time)</label>
                            <select
                                value={selectedTime}
                                onChange={(e) => setSelectedTime(e.target.value)}
                                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">Choose time...</option>
                                {generateTimeSlots().map(slot => (
                                    <option key={slot} value={slot}>
                                        {formatTimeForDisplay(slot)}
                                    </option>
                                ))}
                            </select>
                            <p className="text-xs text-gray-500 mt-1">
                                Times shown are in your configured timezone
                            </p>
                        </div>

                        {/* Duration */}
                        <div>
                            <label className="block font-medium mb-2">Duration</label>
                            <select
                                value={duration}
                                onChange={(e) => setDuration(e.target.value)}
                                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="30">30 minutes</option>
                                <option value="45">45 minutes</option>
                                <option value="60">1 hour</option>
                                <option value="90">1.5 hours</option>
                            </select>
                        </div>

                        {/* Session Notes */}
                        <div>
                            <label className="block font-medium mb-2">
                                Session Agenda/Notes for Client
                            </label>
                            <textarea
                                value={sessionNotes}
                                onChange={(e) => setSessionNotes(e.target.value)}
                                rows={3}
                                placeholder="What will be covered in this session..."
                                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        {/* Client History Summary */}
                        <div className="bg-gray-50 p-4 rounded-lg">
                            <h4 className="font-medium mb-2">Client Summary</h4>
                            <div className="text-sm text-gray-600 space-y-1">
                                <p>Sessions Completed: {client.sessions_count}</p>
                                {client.last_session_date && (
                                    <p>Last Session: {format(parseISO(client.last_session_date), 'MMM dd, yyyy')}</p>
                                )}
                                <p>Assignment Reason: {client.assignment_reason}</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-4 mt-8">
                        <button
                            onClick={handleScheduleSession}
                            disabled={!selectedDate || !selectedTime || isScheduling}
                            className="flex-1 bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
                        >
                            {isScheduling ? 'Scheduling...' : 'Schedule Session'}
                        </button>
                        <button
                            onClick={onClose}
                            className="flex-1 bg-gray-200 text-gray-800 font-bold py-3 rounded-lg hover:bg-gray-300 transition-colors"
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
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-800"></div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold mb-8">My Assigned Clients</h1>

            {clients.length === 0 ? (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
                    <User size={48} className="mx-auto text-gray-400 mb-4" />
                    <h2 className="text-xl font-semibold mb-2">No Assigned Clients Yet</h2>
                    <p className="text-gray-600">
                        You&apos;ll see clients here once they are assigned to you by health coaches.
                    </p>
                </div>
            ) : (
                <div className="grid gap-6">
                    {clients.map(client => (
                        <div key={client.id} className="bg-white rounded-lg border shadow-sm p-6">
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center gap-4 mb-3">
                                        <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                                            <User size={24} className="text-gray-600" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-semibold">
                                                {client.client.full_name}
                                            </h3>
                                            <p className="text-sm text-gray-600">
                                                {client.client.email}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600 mb-4">
                                        <div>
                                            <span className="font-medium">Assigned:</span> {' '}
                                            {format(parseISO(client.assigned_at), 'MMM dd, yyyy')}
                                        </div>
                                        <div>
                                            <span className="font-medium">Sessions:</span> {' '}
                                            {client.sessions_count}
                                        </div>
                                        {client.last_session_date && (
                                            <div>
                                                <span className="font-medium">Last Session:</span> {' '}
                                                {format(parseISO(client.last_session_date), 'MMM dd')}
                                            </div>
                                        )}
                                    </div>

                                    {/* Assignment Reason */}
                                    {client.assignment_reason && (
                                        <div className="bg-gray-50 rounded-lg p-3 mb-4">
                                            <p className="text-sm">
                                                <span className="font-medium">Assignment Note:</span> {client.assignment_reason}
                                            </p>
                                        </div>
                                    )}

                                    {/* Next Appointment Display */}
                                    {client.next_appointment ? (
                                        <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                                            <p className="text-sm font-medium text-green-800">
                                                Next Session: {format(parseISO(client.next_appointment.start_time), 'MMM dd, h:mm a')}
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                                            <div className="flex items-center gap-2">
                                                <AlertCircle size={16} className="text-yellow-600" />
                                                <p className="text-sm font-medium text-yellow-800">
                                                    No upcoming session scheduled
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Action Buttons */}
                                    <div className="flex flex-wrap gap-3">
                                        <button
                                            onClick={() => {
                                                setSelectedClient(client);
                                                setShowScheduler(true);
                                            }}
                                            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
                                        >
                                            <Calendar size={16} />
                                            Schedule Session
                                        </button>

                                        <Link
                                            href={`/dashboard/my-clients/${client.client_id}/plans`}
                                            className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 flex items-center gap-2"
                                        >
                                            <FileText size={16} />
                                            Nutrition Plans
                                        </Link>

                                        <Link
                                            href={`/dashboard/clients/${client.client_id}/progress`}
                                            className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 flex items-center gap-2"
                                        >
                                            <TrendingUp size={16} />
                                            View Progress
                                        </Link>

                                        <Link
                                            href={`/dashboard/messages?to=${client.client_id}`}
                                            className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 flex items-center gap-2"
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