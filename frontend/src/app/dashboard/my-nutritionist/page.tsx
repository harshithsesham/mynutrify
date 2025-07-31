// app/dashboard/my-nutritionist/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { MessageSquare, FileText, Video, Clock, CheckCircle, User } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import Link from 'next/link';

type NutritionistAssignment = {
    id: string;
    nutritionist: {
        id: string;
        full_name: string;
        bio: string;
        specializations: string[];
        hourly_rate: number;
        timezone: string;
    };
    assigned_at: string;
    assignment_reason: string;
};

type Appointment = {
    id: string;
    start_time: string;
    end_time: string;
    meeting_link: string | null;
    session_notes: string | null;
    session_type: string;
    status: string;
};

export default function MyNutritionistPage() {
    const supabase = createClientComponentClient();
    const [loading, setLoading] = useState(true);
    const [assignment, setAssignment] = useState<NutritionistAssignment | null>(null);
    const [upcomingAppointments, setUpcomingAppointments] = useState<Appointment[]>([]);
    const [pastAppointments, setPastAppointments] = useState<Appointment[]>([]);

    const fetchData = useCallback(async () => {
        try {
            // Get current user's profile
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: profile } = await supabase
                .from('profiles')
                .select('id')
                .eq('user_id', user.id)
                .single();

            if (!profile) return;

            // Get nutritionist assignment
            const { data: assignmentData } = await supabase
                .from('nutritionist_assignments')
                .select(`
                    id,
                    assigned_at,
                    assignment_reason,
                    nutritionist:nutritionist_id(
                        id,
                        full_name,
                        bio,
                        specializations,
                        hourly_rate,
                        timezone
                    )
                `)
                .eq('client_id', profile.id)
                .eq('status', 'active')
                .single();

            if (assignmentData && assignmentData.nutritionist && Array.isArray(assignmentData.nutritionist) && assignmentData.nutritionist.length > 0) {
                // Transform the data to match our expected type
                const transformedAssignment: NutritionistAssignment = {
                    id: assignmentData.id,
                    assigned_at: assignmentData.assigned_at,
                    assignment_reason: assignmentData.assignment_reason,
                    nutritionist: assignmentData.nutritionist[0] // Take the first (and should be only) nutritionist
                };

                setAssignment(transformedAssignment);

                // Get appointments with this nutritionist
                const { data: appointments } = await supabase
                    .from('appointments')
                    .select('*')
                    .eq('client_id', profile.id)
                    .eq('professional_id', assignmentData.nutritionist[0].id)
                    .order('start_time', { ascending: true });

                if (appointments) {
                    const now = new Date();
                    setUpcomingAppointments(
                        appointments.filter((apt: Appointment) =>
                            new Date(apt.start_time) > now && apt.status === 'confirmed'
                        )
                    );
                    setPastAppointments(
                        appointments.filter((apt: Appointment) =>
                            new Date(apt.start_time) <= now || apt.status !== 'confirmed'
                        )
                    );
                }
            }
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    }, [supabase]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-800"></div>
            </div>
        );
    }

    if (!assignment) {
        return (
            <div className="max-w-4xl mx-auto px-4 py-8">
                <h1 className="text-3xl font-bold mb-8">My Nutritionist</h1>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
                    <User size={48} className="mx-auto text-yellow-600 mb-4" />
                    <h2 className="text-xl font-semibold mb-2">No Nutritionist Assigned Yet</h2>
                    <p className="text-yellow-800 mb-4">
                        You&apos;ll be assigned a nutritionist after your initial health consultation.
                    </p>
                    <Link
                        href="/book-consultation"
                        className="inline-block bg-blue-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-blue-700"
                    >
                        Book Initial Consultation
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold mb-8">My Nutritionist</h1>

            {/* Nutritionist Info Card */}
            <div className="bg-white rounded-2xl border shadow-sm p-8 mb-8">
                <div className="mb-6">
                    <div className="flex items-start justify-between">
                        <div>
                            <h2 className="text-2xl font-semibold mb-2">
                                {assignment.nutritionist.full_name}
                            </h2>
                            <p className="text-gray-600 mb-4">
                                {assignment.nutritionist.specializations?.join(', ')}
                            </p>
                            {assignment.nutritionist.bio && (
                                <p className="text-gray-700 mb-4">
                                    {assignment.nutritionist.bio}
                                </p>
                            )}
                            <div className="text-sm text-gray-600">
                                <p>Assigned on: {format(parseISO(assignment.assigned_at), 'MMMM dd, yyyy')}</p>
                                {assignment.assignment_reason && (
                                    <p className="mt-1">Reason: {assignment.assignment_reason}</p>
                                )}
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-lg font-semibold">
                                ₹{assignment.nutritionist.hourly_rate}/hour
                            </p>
                            <p className="text-sm text-gray-500">
                                Timezone: {assignment.nutritionist.timezone}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Status Card */}
                {upcomingAppointments.length === 0 && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                        <div className="flex items-center gap-3">
                            <Clock className="text-blue-600" size={24} />
                            <div>
                                <p className="font-medium text-blue-900">
                                    Awaiting Schedule
                                </p>
                                <p className="text-sm text-blue-700">
                                    Your nutritionist will schedule your next session based on your progress and needs.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Contact Options */}
                <div className="flex gap-4">
                    <Link
                        href={`/dashboard/messages?to=${assignment.nutritionist.id}`}
                        className="flex-1 bg-gray-200 text-gray-800 font-medium py-3 px-4 rounded-lg hover:bg-gray-300 flex items-center justify-center gap-2"
                    >
                        <MessageSquare size={18} />
                        Send Message
                    </Link>
                    <Link
                        href="/dashboard/my-plans"
                        className="flex-1 bg-gray-200 text-gray-800 font-medium py-3 px-4 rounded-lg hover:bg-gray-300 flex items-center justify-center gap-2"
                    >
                        <FileText size={18} />
                        View My Plans
                    </Link>
                </div>
            </div>

            {/* Upcoming Appointments */}
            {upcomingAppointments.length > 0 && (
                <div className="mb-8">
                    <h3 className="text-xl font-semibold mb-4">Upcoming Sessions</h3>
                    <div className="space-y-4">
                        {upcomingAppointments.map((apt) => (
                            <div key={apt.id} className="bg-white border rounded-lg p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="font-medium text-lg">
                                            {format(parseISO(apt.start_time), 'EEEE, MMMM do, yyyy')}
                                        </p>
                                        <p className="text-gray-600">
                                            {format(parseISO(apt.start_time), 'h:mm a')} -
                                            {format(parseISO(apt.end_time), 'h:mm a')}
                                        </p>
                                        {apt.session_type && (
                                            <p className="text-sm text-gray-500 mt-1">
                                                Type: {apt.session_type}
                                            </p>
                                        )}
                                        {apt.session_notes && (
                                            <p className="text-sm text-gray-600 mt-2 bg-gray-50 p-2 rounded">
                                                Note: {apt.session_notes}
                                            </p>
                                        )}
                                    </div>
                                    {apt.meeting_link && (
                                        <a
                                            href={apt.meeting_link}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2"
                                        >
                                            <Video size={16} />
                                            Join Call
                                        </a>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Past Appointments */}
            {pastAppointments.length > 0 && (
                <div>
                    <h3 className="text-xl font-semibold mb-4">Session History</h3>
                    <div className="space-y-3">
                        {pastAppointments.map((apt) => (
                            <div key={apt.id} className="bg-gray-50 border rounded-lg p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="font-medium">
                                            {format(parseISO(apt.start_time), 'MMM dd, yyyy')}
                                        </p>
                                        <p className="text-sm text-gray-600">
                                            {apt.session_type || 'Regular Session'}
                                        </p>
                                    </div>
                                    <CheckCircle className="text-green-600" size={20} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}