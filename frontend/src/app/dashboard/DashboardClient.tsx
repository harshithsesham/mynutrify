// Also update the DashboardClient component to handle the new appointment format:

// frontend/src/app/dashboard/DashboardClient.tsx
'use client';

import Link from 'next/link';
import { Calendar, Video } from 'lucide-react';
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
    return (
        <div className="max-w-7xl mx-auto text-gray-800">
            <h1 className="text-4xl font-bold">Welcome back, {profile.full_name}!</h1>
            <p className="text-lg capitalize text-gray-600 mb-8">{profile.role.replace('_', ' ')} Dashboard</p>

            {/* Main Content: Upcoming Appointments - now takes up the full width */}
            <div className="bg-white border border-gray-200 p-6 rounded-2xl shadow-sm">
                <h2 className="text-2xl font-semibold mb-4 flex items-center">
                    <Calendar size={24} className="mr-3 text-gray-500" />
                    Upcoming Appointments
                </h2>
                <div className="space-y-4">
                    {upcomingAppointments.length > 0 ? (
                        upcomingAppointments.map((apt) => (
                            <div key={apt.id} className="bg-gray-50 border border-gray-200 p-4 rounded-lg flex justify-between items-center">
                                <div className="flex-1">
                                    <p className="font-bold">
                                        {format(new Date(apt.start_time), 'MMMM do, yyyy')} at {format(new Date(apt.start_time), 'p')}
                                    </p>
                                    <p className="text-gray-600">
                                        {profile.role === 'client'
                                            ? `With ${apt.professional?.full_name}`
                                            : `With ${apt.client?.full_name}`
                                        }
                                    </p>
                                    {apt.session_type && (
                                        <p className="text-sm text-gray-500">{apt.session_type}</p>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    {apt.meeting_link && apt.meeting_link !== 'Google Meet link will be generated' && (
                                        <a
                                            href={apt.meeting_link}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-2 bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 text-sm font-medium"
                                        >
                                            <Video size={14} />
                                            Join
                                        </a>
                                    )}
                                    <Link
                                        href={
                                            profile.role === 'health_coach'
                                                ? (typeof apt.id === 'string' && apt.id.startsWith('consultation_')
                                                    ? "/dashboard/health-coach/consultation-requests"
                                                    : "/dashboard/my-appointments")
                                                : "/dashboard/my-appointments"
                                        }
                                        className="text-gray-800 hover:underline font-semibold"
                                    >
                                        View
                                    </Link>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-8">
                            <Calendar size={48} className="mx-auto text-gray-300 mb-4" />
                            <p className="text-gray-500">You have no upcoming appointments.</p>
                            {profile.role === 'client' && (
                                <Link
                                    href="/dashboard/find-a-pro"
                                    className="inline-block mt-4 bg-gray-800 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
                                >
                                    Find a Professional
                                </Link>
                            )}
                            {profile.role === 'health_coach' && (
                                <Link
                                    href="/dashboard/health-coach/consultation-requests"
                                    className="inline-block mt-4 bg-gray-800 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
                                >
                                    View Consultation Requests
                                </Link>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}