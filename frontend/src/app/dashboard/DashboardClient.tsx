// frontend/src/app/dashboard/DashboardClient.tsx
'use client';

import Link from 'next/link';
import {Calendar, Video, ArrowRight, Clock, AlertCircle, User, Loader2, FileText, MessageSquare} from 'lucide-react';
import { format } from 'date-fns';

// Define types to match the props we'll receive from the server component
type Profile = {
    full_name: string;
    role: string;
};

type AppointmentWithOtherParty = {
    id: number | string;
    start_time: string;
    professional?: { full_name: string };
    client?: { full_name: string };
    meeting_link?: string;
    session_type?: string;
};

interface DashboardClientProps {
    profile: Profile;
    upcomingAppointments: AppointmentWithOtherParty[];
}

// This is a Client Component responsible only for rendering the UI
export default function DashboardClient({ profile, upcomingAppointments }: DashboardClientProps) {
    const roleDisplay = profile.role.replace('_', ' ');

    // Determine the next action URL for the "View" button
    const getAppointmentLink = (apt: AppointmentWithOtherParty) => {
        if (profile.role === 'health_coach') {
            return (typeof apt.id === 'string' && apt.id.startsWith('consultation_')
                ? "/dashboard/health-coach/consultation-requests"
                : "/dashboard/my-appointments");
        }
        return "/dashboard/my-appointments";
    };

    return (
        <div className="max-w-7xl mx-auto text-gray-800">
            <h1 className="text-4xl font-extrabold text-gray-900">Welcome back, {profile.full_name}!</h1>
            <p className="text-lg capitalize text-teal-600 font-medium mb-8">{roleDisplay} Dashboard</p>

            {/* Upcoming Appointments Card - Unified, shadow-based design */}
            <div className="bg-white border border-gray-200 p-6 rounded-2xl shadow-xl">
                <h2 className="text-2xl font-bold mb-6 flex items-center text-gray-900">
                    <Calendar size={24} className="mr-3 text-teal-600" />
                    Your Upcoming Sessions
                </h2>

                <div className="space-y-4">
                    {upcomingAppointments.length > 0 ? (
                        upcomingAppointments.map((apt) => {
                            const otherPartyName = profile.role === 'client'
                                ? apt.professional?.full_name || 'Your Professional'
                                : apt.client?.full_name || 'A Client';

                            const isConsultation = profile.role === 'health_coach' && (typeof apt.id === 'string' && apt.id.startsWith('consultation_'));

                            return (
                                <div
                                    key={apt.id}
                                    className="bg-gray-50 border border-gray-200 p-4 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center transition-shadow hover:shadow-lg hover:bg-gray-100"
                                >
                                    <div className="flex-1 min-w-0 mb-2 sm:mb-0">
                                        <p className="text-sm font-semibold text-gray-600 flex items-center gap-2 mb-1">
                                            <Clock size={16} />
                                            {format(new Date(apt.start_time), 'MMMM do, yyyy')} at {format(new Date(apt.start_time), 'p')} IST
                                        </p>
                                        <p className="text-lg font-bold text-gray-900 truncate">
                                            {apt.session_type || (isConsultation ? 'New Consultation' : 'Regular Session')}
                                        </p>
                                        <p className="text-gray-700 text-sm">
                                            {profile.role === 'client' ? 'With' : 'For'} <span className="font-semibold">{otherPartyName}</span>
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-3 flex-shrink-0">
                                        {apt.meeting_link && apt.meeting_link !== 'Google Meet link will be generated' && (
                                            <a
                                                href={apt.meeting_link}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-full hover:bg-green-700 text-sm font-bold transition-colors shadow-md"
                                            >
                                                <Video size={16} />
                                                Join Call
                                            </a>
                                        )}
                                        <Link
                                            href={getAppointmentLink(apt)}
                                            className="text-teal-600 hover:text-teal-700 font-bold p-2 rounded-full hover:bg-teal-50 transition-colors flex items-center"
                                        >
                                            View Details
                                            <ArrowRight size={20} className="ml-1" />
                                        </Link>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="text-center py-10 bg-gray-50 rounded-xl border border-gray-200">
                            <AlertCircle size={48} className="mx-auto text-orange-500 mb-4" />
                            <p className="text-gray-700 font-semibold mb-4">You have no upcoming appointments.</p>

                            {/* Contextual CTA */}
                            {profile.role === 'client' && (
                                <Link
                                    href="/dashboard/my-nutritionist"
                                    className="inline-block mt-4 bg-teal-600 text-white px-6 py-3 rounded-full hover:bg-teal-700 font-bold shadow-lg transition-colors"
                                >
                                    View My Professional
                                </Link>
                            )}
                            {profile.role === 'health_coach' && (
                                <Link
                                    href="/dashboard/health-coach/consultation-requests"
                                    className="inline-block mt-4 bg-teal-600 text-white px-6 py-3 rounded-full hover:bg-teal-700 font-bold shadow-lg transition-colors"
                                >
                                    Review Requests
                                </Link>
                            )}
                            {profile.role === 'nutritionist' && (
                                <Link
                                    href="/dashboard/nutritionist/assigned-clients"
                                    className="inline-block mt-4 bg-teal-600 text-white px-6 py-3 rounded-full hover:bg-teal-700 font-bold shadow-lg transition-colors"
                                >
                                    Manage Clients
                                </Link>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Contextual Quick Links (Optional, placed outside main appointment card) */}
            {profile.role === 'client' && (
                <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Link
                        href="/dashboard/my-plans"
                        className="bg-white border border-gray-200 p-5 rounded-2xl shadow-md flex items-center justify-between hover:bg-teal-50 transition-all group"
                    >
                        <h3 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                            <FileText size={24} className="text-teal-600" />
                            My Nutrition Plans
                        </h3>
                        <ArrowRight size={24} className="text-teal-500 group-hover:translate-x-1 transition-transform" />
                    </Link>
                    <Link
                        href="/dashboard/messages"
                        className="bg-white border border-gray-200 p-5 rounded-2xl shadow-md flex items-center justify-between hover:bg-teal-50 transition-all group"
                    >
                        <h3 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                            <MessageSquare size={24} className="text-teal-600" />
                            Messages
                        </h3>
                        <ArrowRight size={24} className="text-teal-500 group-hover:translate-x-1 transition-transform" />
                    </Link>
                </div>
            )}
        </div>
    );
}