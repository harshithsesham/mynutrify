// app/dashboard/my-nutritionist/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { MessageSquare, FileText, Video, Clock, CheckCircle, User, DollarSign, Calendar, Info, Loader2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import Link from 'next/link';

// --- TYPE DEFINITIONS ---
type Nutritionist = {
    id: string;
    full_name: string;
    bio: string | null;
    specializations: string[] | null;
    hourly_rate: number | null;
    timezone: string | null;
};

type NutritionistAssignment = {
    id: string;
    assigned_at: string | null;
    assignment_reason: string | null;
    nutritionist: Nutritionist;
};

type Appointment = {
    id: string;
    start_time: string;
    end_time: string;
    meeting_link: string | null;
    session_notes: string | null;
    session_type: string | null;
    status: string;
};

type AssignmentRow = {
    id: string;
    assigned_at: string | null;
    assignment_reason: string | null;
    status: string;
    nutritionist: Nutritionist | Nutritionist[] | null;
};

// --- MAIN COMPONENT ---
export default function MyNutritionistPage() {
    const supabase = createClientComponentClient();
    const [loading, setLoading] = useState(true);
    const [assignment, setAssignment] = useState<NutritionistAssignment | null>(null);
    const [upcomingAppointments, setUpcomingAppointments] = useState<Appointment[]>([]);
    const [pastAppointments, setPastAppointments] = useState<Appointment[]>([]);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            // 1) Auth user
            const {
                data: { user },
                error: userErr,
            } = await supabase.auth.getUser();
            if (userErr) throw userErr;
            if (!user) return;

            // 2) Profile id
            const { data: profile, error: profileErr } = await supabase
                .from('profiles')
                .select('id')
                .eq('user_id', user.id)
                .single();
            if (profileErr) throw profileErr;
            if (!profile) return;

            // 3) Active nutritionist assignment (JOIN)
            const { data: assignmentData, error: assignErr } = await supabase
                .from('nutritionist_assignments')
                .select(
                    `
                        id,
                        assigned_at,
                        assignment_reason,
                        status,
                        nutritionist:nutritionist_id (
                            id,
                            full_name,
                            bio,
                            specializations,
                            hourly_rate,
                            timezone
                        )
                    `
                )
                .eq('client_id', profile.id)
                .eq('status', 'active')
                .maybeSingle()
                .returns<AssignmentRow>();

            if (assignErr) throw assignErr;

            // Normalize object | array | null
            const nut: Nutritionist | null =
                assignmentData?.nutritionist == null
                    ? null
                    : Array.isArray(assignmentData.nutritionist)
                        ? assignmentData.nutritionist[0] ?? null
                        : assignmentData.nutritionist;

            if (assignmentData && nut) {
                const transformed: NutritionistAssignment = {
                    id: assignmentData.id,
                    assigned_at: assignmentData.assigned_at,
                    assignment_reason: assignmentData.assignment_reason,
                    nutritionist: nut,
                };

                setAssignment(transformed);

                // 4) Fetch appointments for this nutritionist + client
                const { data: appointments, error: apptErr } = await supabase
                    .from('appointments')
                    .select(
                        'id,start_time,end_time,meeting_link,session_notes,session_type,status,client_id,professional_id'
                    )
                    .eq('client_id', profile.id)
                    .eq('professional_id', nut.id)
                    .order('start_time', { ascending: true });

                if (apptErr) throw apptErr;

                if (appointments) {
                    const now = new Date();
                    setUpcomingAppointments(
                        appointments.filter(
                            (apt: Appointment) =>
                                new Date(apt.start_time) > now && apt.status === 'confirmed'
                        )
                    );
                    setPastAppointments(
                        appointments.filter(
                            (apt: Appointment) =>
                                new Date(apt.start_time) <= now || apt.status !== 'confirmed'
                        )
                    );
                } else {
                    setUpcomingAppointments([]);
                    setPastAppointments([]);
                }
            } else {
                // no active assignment
                setAssignment(null);
                setUpcomingAppointments([]);
                setPastAppointments([]);
            }
        } catch (err) {
            console.error('MyNutritionistPage fetchData error:', err);
            setAssignment(null);
            setUpcomingAppointments([]);
            setPastAppointments([]);
        } finally {
            setLoading(false);
        }
    }, [supabase]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 size={32} className="animate-spin text-teal-600 mx-auto" />
            </div>
        );
    }

    if (!assignment) {
        return (
            <div className="max-w-4xl mx-auto px-4 py-8">
                <h1 className="text-4xl font-extrabold text-gray-900 mb-8">My Professional</h1>
                <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center shadow-xl">
                    <div className="w-16 h-16 bg-yellow-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <User size={32} className="text-yellow-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">No Professional Assigned Yet</h2>
                    <p className="text-gray-600 mb-6">
                        You&apos;ll be assigned a professional after your initial health consultation is completed.
                    </p>
                    <Link
                        href="/book-consultation"
                        className="inline-block bg-teal-600 text-white font-bold py-3 px-6 rounded-full hover:bg-teal-700 transition-colors shadow-lg"
                    >
                        Book Initial Consultation
                    </Link>
                </div>
            </div>
        );
    }

    // --- RENDER ASSIGNED PROFESSIONAL ---
    return (
        <div className="max-w-4xl mx-auto px-4 py-8">
            <h1 className="text-4xl font-extrabold text-gray-900 mb-8">My Professional</h1>

            {/* Nutritionist Info Card (Redesigned) */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-xl p-6 sm:p-8 mb-8">
                <div className="flex items-center gap-6 mb-6 border-b pb-4">
                    <div className="w-16 h-16 bg-teal-50 rounded-full flex items-center justify-center flex-shrink-0">
                        <User size={32} className="text-teal-600" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">
                            {assignment.nutritionist.full_name}
                        </h2>
                        <p className="text-gray-600 font-medium capitalize">
                            {assignment.nutritionist.specializations?.join(', ') || 'Nutrition Professional'}
                        </p>
                    </div>
                </div>

                {/* Details and Actions */}
                <div className="grid gap-6">
                    {assignment.nutritionist.bio && (
                        <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                            <p className="text-sm font-semibold text-gray-900 mb-1">Bio:</p>
                            <p className="text-gray-700 text-sm">{assignment.nutritionist.bio}</p>
                        </div>
                    )}

                    {/* Key Metrics */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                        <div className="bg-gray-50 rounded-lg p-3">
                            <p className="font-semibold text-xs uppercase text-gray-600 mb-1">Assigned Date</p>
                            <p className="text-gray-900 font-bold flex items-center gap-1">
                                <Calendar size={14} className="text-teal-500" />
                                {assignment.assigned_at ? format(parseISO(assignment.assigned_at), 'MMM dd, yyyy') : '—'}
                            </p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3">
                            <p className="font-semibold text-xs uppercase text-gray-600 mb-1">Hourly Rate</p>
                            <p className="text-gray-900 font-bold flex items-center gap-1">
                                <DollarSign size={14} className="text-teal-500" />
                                {assignment.nutritionist.hourly_rate !== null ? `₹${assignment.nutritionist.hourly_rate}/hr` : 'N/A'}
                            </p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3">
                            <p className="font-semibold text-xs uppercase text-gray-600 mb-1">Timezone</p>
                            <p className="text-gray-900 font-bold">
                                {/* FIX: Explicitly stating IST as the default if timezone is null or empty */}
                                {assignment.nutritionist.timezone ? assignment.nutritionist.timezone.split('/').pop()?.replace('_', ' ') : 'IST'}
                            </p>
                        </div>
                    </div>

                    {assignment.assignment_reason && (
                        <div className="bg-teal-50 border border-teal-200 rounded-xl p-4">
                            <p className="text-sm text-teal-800">
                                <Info size={16} className="inline mr-1" />
                                <span className="font-bold">Reason:</span> {assignment.assignment_reason}
                            </p>
                        </div>
                    )}
                </div>

                {/* Contact Options (Redesigned) */}
                <div className="flex flex-col sm:flex-row gap-4 mt-8">
                    <Link
                        href={`/dashboard/messages?to=${assignment.nutritionist.id}`}
                        className="flex-1 bg-teal-600 text-white font-bold py-3 px-4 rounded-full hover:bg-teal-700 flex items-center justify-center gap-2 shadow-lg transition-colors"
                    >
                        <MessageSquare size={18} />
                        Send Message
                    </Link>
                    <Link
                        href="/dashboard/my-plans"
                        className="flex-1 bg-gray-200 text-gray-800 font-bold py-3 px-4 rounded-full hover:bg-gray-300 flex items-center justify-center gap-2 transition-colors"
                    >
                        <FileText size={18} />
                        View My Plans
                    </Link>
                </div>
            </div>

            {/* Upcoming Appointments */}
            {upcomingAppointments.length > 0 && (
                <div className="mb-8">
                    <h3 className="text-2xl font-bold mb-4 text-gray-900">Upcoming Sessions</h3>
                    <div className="space-y-4">
                        {upcomingAppointments.map((apt) => (
                            <div key={apt.id} className="bg-white border border-gray-200 rounded-xl p-6 shadow-md">
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                    <div className="flex-1">
                                        <p className="font-bold text-gray-900 text-lg">
                                            {format(parseISO(apt.start_time), 'EEEE, MMMM do')}
                                        </p>
                                        <p className="text-gray-700 font-medium">
                                            {format(parseISO(apt.start_time), 'h:mm a')} -{' '}
                                            {format(parseISO(apt.end_time), 'h:mm a')} (IST) {/* Showing IST as discussed */}
                                        </p>
                                        {apt.session_type && (
                                            <p className="text-sm text-gray-500 mt-1">
                                                Type: {apt.session_type}
                                            </p>
                                        )}
                                    </div>
                                    {apt.meeting_link ? (
                                        <a
                                            href={apt.meeting_link}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="bg-green-600 text-white px-4 py-2 rounded-full hover:bg-green-700 flex items-center gap-2 font-semibold shadow-sm transition-colors"
                                        >
                                            <Video size={16} />
                                            Join Call
                                        </a>
                                    ) : (
                                        <div className="bg-gray-100 text-gray-600 px-4 py-2 rounded-full text-sm font-medium">
                                            Link Pending
                                        </div>
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
                    <h3 className="text-2xl font-bold mb-4 text-gray-900">Session History</h3>
                    <div className="space-y-3">
                        {pastAppointments.map((apt) => (
                            <div key={apt.id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="font-medium text-gray-800">
                                            {format(parseISO(apt.start_time), 'MMM dd, yyyy')}
                                        </p>
                                        <p className="text-sm text-gray-600">
                                            {apt.session_type ?? 'Regular Session'}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2 text-green-600 font-medium">
                                        <CheckCircle size={18} />
                                        Completed
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}