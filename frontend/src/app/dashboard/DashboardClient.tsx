// app/dashboard/DashboardClient.tsx
'use client';

import Link from 'next/link';
import { Calendar } from 'lucide-react';
import { format } from 'date-fns';

// Define types to match the props we'll receive from the server component
type Profile = {
    full_name: string;
    role: string;
};

type AppointmentWithOtherParty = {
    id: number;
    start_time: string;
    professional?: { full_name: string };
    client?: { full_name: string };
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
            <p className="text-lg capitalize text-gray-600 mb-8">{profile.role} Dashboard</p>

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
                                <div>
                                    <p className="font-bold">{format(new Date(apt.start_time), 'MMMM do, yyyy')} at {format(new Date(apt.start_time), 'p')}</p>
                                    <p className="text-gray-600">With {profile.role === 'client' ? apt.professional?.full_name : apt.client?.full_name}</p>
                                </div>
                                <Link href="/dashboard/my-appointments" className="text-gray-800 hover:underline font-semibold">
                                    View
                                </Link>
                            </div>
                        ))
                    ) : (
                        <p className="text-gray-500">You have no upcoming appointments.</p>
                    )}
                </div>
            </div>
        </div>
    );
}
