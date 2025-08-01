// app/dashboard/health-coach/consultation-requests/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Calendar, Phone, Mail, User, X, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';

type ConsultationRequest = {
    id: string;
    full_name: string;
    email: string;
    phone: string;
    age: number;
    gender: string;
    health_goals: string;
    current_challenges: string;
    preferred_days: string[];
    preferred_time_slots: string[];
    status: string;
    created_at: string;
    scheduled_date?: string;
    scheduled_time?: string;
};

export default function ConsultationRequestsPage() {
    const supabase = createClientComponentClient();
    const [allRequests, setAllRequests] = useState<ConsultationRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedRequest, setSelectedRequest] = useState<ConsultationRequest | null>(null);
    const [showScheduler, setShowScheduler] = useState(false);
    const [filter, setFilter] = useState('pending');
    const [expandedRequest, setExpandedRequest] = useState<string | null>(null);

    const fetchRequests = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            // Fetch ALL requests first
            const { data, error: fetchError } = await supabase
                .from('consultation_requests')
                .select('*')
                .order('created_at', { ascending: false });

            if (fetchError) {
                throw fetchError;
            }

            // Safely process the data with null checks
            const processedRequests = (data || []).map((request: Record<string, unknown>) => ({
                ...request,
                // Ensure arrays are always arrays, never null
                preferred_days: Array.isArray(request.preferred_days) ? request.preferred_days : [],
                preferred_time_slots: Array.isArray(request.preferred_time_slots) ? request.preferred_time_slots : [],
                // Ensure strings are never null
                full_name: request.full_name || 'Unknown Name',
                email: request.email || '',
                phone: request.phone || '',
                health_goals: request.health_goals || '',
                current_challenges: request.current_challenges || '',
                gender: request.gender || '',
                status: request.status || 'pending',
                created_at: request.created_at || new Date().toISOString(),
                age: request.age || 0,
            })) as ConsultationRequest[];

            setAllRequests(processedRequests);
        } catch (err) {
            console.error('Error fetching consultation requests:', err);
            setError(err instanceof Error ? err.message : 'Failed to load consultation requests');
        } finally {
            setLoading(false);
        }
    }, [supabase]);

    useEffect(() => {
        fetchRequests();
    }, [fetchRequests]);

    // Calculate counts from all requests
    const requestCounts = {
        pending: allRequests.filter(r => r.status === 'pending').length,
        scheduled: allRequests.filter(r => r.status === 'scheduled').length,
        completed: allRequests.filter(r => r.status === 'completed').length,
        all: allRequests.length
    };

    // Filter requests based on current filter
    const filteredRequests = allRequests.filter(r => filter === 'all' || r.status === filter);

    const ConsultationScheduler = ({ request, onClose }: {
        request: ConsultationRequest;
        onClose: () => void
    }) => {
        const [selectedDate, setSelectedDate] = useState('');
        const [selectedTime, setSelectedTime] = useState('');
        const [meetingType, setMeetingType] = useState('video');
        const [notes, setNotes] = useState('');
        const [isScheduling, setIsScheduling] = useState(false);

        const handleSchedule = async () => {
            setIsScheduling(true);

            try {
                const response = await fetch('/api/health-coach/schedule-consultation', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        requestId: request.id,
                        scheduledDate: selectedDate,
                        scheduledTime: selectedTime,
                        meetingType,
                        notes
                    })
                });

                if (response.ok) {
                    alert('Consultation scheduled successfully!');
                    onClose();
                    fetchRequests(); // Refresh all requests
                } else {
                    throw new Error('Failed to schedule consultation');
                }
            } catch (error) {
                console.error('Error scheduling consultation:', error);
                alert('Error scheduling consultation. Please try again.');
            } finally {
                setIsScheduling(false);
            }
        };

        // Safe array access for preferred days/times
        const preferredDays = Array.isArray(request.preferred_days) ? request.preferred_days : [];
        const preferredTimeSlots = Array.isArray(request.preferred_time_slots) ? request.preferred_time_slots : [];

        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold">
                            Schedule Consultation
                        </h2>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600"
                        >
                            <X size={24} />
                        </button>
                    </div>

                    {/* Client Info Summary */}
                    <div className="bg-gray-50 rounded-lg p-4 mb-6">
                        <h3 className="font-semibold mb-2">Client Information</h3>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                            <p><span className="font-medium">Name:</span> {request.full_name}</p>
                            <p><span className="font-medium">Email:</span> {request.email}</p>
                            <p><span className="font-medium">Phone:</span> {request.phone}</p>
                            <p><span className="font-medium">Age:</span> {request.age} years</p>
                            <p><span className="font-medium">Gender:</span> {request.gender}</p>
                        </div>
                        <div className="mt-2">
                            <p className="font-medium">Health Goals:</p>
                            <p className="text-sm text-gray-600">{request.health_goals}</p>
                        </div>
                        {(preferredDays.length > 0 || preferredTimeSlots.length > 0) && (
                            <div className="mt-2">
                                <p className="font-medium">Preferred Times:</p>
                                <p className="text-sm text-gray-600">
                                    {preferredDays.length > 0 ? preferredDays.join(', ') : 'No day preference'} - {preferredTimeSlots.length > 0 ? preferredTimeSlots.join(', ') : 'No time preference'}
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block font-medium mb-2">Date</label>
                                <input
                                    type="date"
                                    value={selectedDate}
                                    min={new Date().toISOString().split('T')[0]}
                                    onChange={(e) => setSelectedDate(e.target.value)}
                                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block font-medium mb-2">Time</label>
                                <select
                                    value={selectedTime}
                                    onChange={(e) => setSelectedTime(e.target.value)}
                                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                    required
                                >
                                    <option value="">Select time...</option>
                                    <option value="09:00">9:00 AM</option>
                                    <option value="10:00">10:00 AM</option>
                                    <option value="11:00">11:00 AM</option>
                                    <option value="14:00">2:00 PM</option>
                                    <option value="15:00">3:00 PM</option>
                                    <option value="16:00">4:00 PM</option>
                                    <option value="17:00">5:00 PM</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block font-medium mb-2">Meeting Type</label>
                            <select
                                value={meetingType}
                                onChange={(e) => setMeetingType(e.target.value)}
                                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="video">Video Call (Google Meet)</option>
                                <option value="phone">Phone Call</option>
                            </select>
                        </div>

                        <div>
                            <label className="block font-medium mb-2">
                                Pre-consultation Notes (Optional)
                            </label>
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                rows={3}
                                placeholder="Any specific points to discuss..."
                                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div className="flex gap-4 mt-6">
                            <button
                                onClick={handleSchedule}
                                disabled={!selectedDate || !selectedTime || isScheduling}
                                className="flex-1 bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
                            >
                                {isScheduling ? 'Scheduling...' : 'Schedule & Send Confirmation'}
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
            </div>
        );
    };

    // Error state
    if (error) {
        return (
            <div className="max-w-6xl mx-auto px-4 py-8">
                <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                    <h1 className="text-xl font-bold text-red-800 mb-2">Error Loading Consultation Requests</h1>
                    <p className="text-red-700 mb-4">{error}</p>
                    <button
                        onClick={() => {
                            setError(null);
                            fetchRequests();
                        }}
                        className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                    >
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    // Loading state
    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-800"></div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold mb-8">Consultation Requests</h1>

            {/* Filter Tabs - Now with dynamic counts */}
            <div className="flex gap-4 mb-6 border-b">
                {[
                    { key: 'pending', label: 'Pending', count: requestCounts.pending },
                    { key: 'scheduled', label: 'Scheduled', count: requestCounts.scheduled },
                    { key: 'completed', label: 'Completed', count: requestCounts.completed },
                    { key: 'all', label: 'All', count: requestCounts.all }
                ].map((tab) => (
                    <button
                        key={tab.key}
                        onClick={() => setFilter(tab.key)}
                        className={`px-4 py-2 font-medium capitalize ${
                            filter === tab.key
                                ? 'border-b-2 border-blue-600 text-blue-600'
                                : 'text-gray-600 hover:text-gray-800'
                        }`}
                    >
                        {tab.label} ({tab.count})
                    </button>
                ))}
            </div>

            {/* Requests List */}
            <div className="space-y-4">
                {filteredRequests.map(request => {
                    // Safe array access for rendering
                    const preferredDays = Array.isArray(request.preferred_days) ? request.preferred_days : [];
                    const preferredTimeSlots = Array.isArray(request.preferred_time_slots) ? request.preferred_time_slots : [];

                    return (
                        <div key={request.id} className="bg-white rounded-lg border shadow-sm">
                            <div className="p-6">
                                <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-4 mb-2">
                                            <h3 className="text-xl font-semibold">{request.full_name}</h3>
                                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                                                request.status === 'pending'
                                                    ? 'bg-yellow-100 text-yellow-800'
                                                    : request.status === 'scheduled'
                                                        ? 'bg-blue-100 text-blue-800'
                                                        : 'bg-green-100 text-green-800'
                                            }`}>
                                                {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                                            </span>
                                            <span className="text-sm text-gray-500">
                                                Submitted {format(new Date(request.created_at), 'MMM dd, h:mm a')}
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                                            <div className="flex items-center gap-2">
                                                <Mail size={16} className="text-gray-400" />
                                                <span>{request.email}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Phone size={16} className="text-gray-400" />
                                                <span>{request.phone}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <User size={16} className="text-gray-400" />
                                                <span>{request.age} yrs, {request.gender}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Calendar size={16} className="text-gray-400" />
                                                <span>
                                                    {preferredDays.length > 0
                                                        ? preferredDays.slice(0, 2).join(', ') + (preferredDays.length > 2 ? '...' : '')
                                                        : 'No preference'
                                                    }
                                                </span>
                                            </div>
                                        </div>

                                        {request.status === 'scheduled' && request.scheduled_date && (
                                            <div className="bg-blue-50 rounded-lg p-3 mb-4">
                                                <p className="font-medium text-blue-900">
                                                    Scheduled for: {format(new Date(request.scheduled_date), 'MMMM dd, yyyy')}
                                                    {request.scheduled_time && ` at ${request.scheduled_time}`}
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    <div className="ml-4 flex items-center gap-2">
                                        {request.status === 'pending' && (
                                            <button
                                                onClick={() => {
                                                    setSelectedRequest(request);
                                                    setShowScheduler(true);
                                                }}
                                                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                                            >
                                                Schedule Call
                                            </button>
                                        )}

                                        <button
                                            onClick={() => setExpandedRequest(
                                                expandedRequest === request.id ? null : request.id
                                            )}
                                            className="p-2 hover:bg-gray-100 rounded-lg"
                                        >
                                            {expandedRequest === request.id ?
                                                <ChevronUp size={20} /> :
                                                <ChevronDown size={20} />
                                            }
                                        </button>
                                    </div>
                                </div>

                                {expandedRequest === request.id && (
                                    <div className="mt-4 pt-4 border-t space-y-3">
                                        <div>
                                            <p className="font-medium text-sm mb-1">Primary Health Goals:</p>
                                            <p className="text-gray-600">{request.health_goals}</p>
                                        </div>
                                        {request.current_challenges && (
                                            <div>
                                                <p className="font-medium text-sm mb-1">Current Challenges:</p>
                                                <p className="text-gray-600">{request.current_challenges}</p>
                                            </div>
                                        )}
                                        <div>
                                            <p className="font-medium text-sm mb-1">Availability:</p>
                                            <p className="text-gray-600">
                                                Days: {preferredDays.length > 0 ? preferredDays.join(', ') : 'No preference'}<br />
                                                Times: {preferredTimeSlots.length > 0 ? preferredTimeSlots.join(', ') : 'No preference'}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* No requests message */}
            {filteredRequests.length === 0 && (
                <div className="text-center text-gray-500 py-12">
                    <h2 className="text-xl font-semibold mb-2">No {filter === 'all' ? '' : filter} requests found</h2>
                    <p>Check back later for new consultation requests.</p>
                </div>
            )}

            {showScheduler && selectedRequest && (
                <ConsultationScheduler
                    request={selectedRequest}
                    onClose={() => {
                        setShowScheduler(false);
                        setSelectedRequest(null);
                    }}
                />
            )}
        </div>
    );
}