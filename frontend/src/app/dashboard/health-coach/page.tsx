// app/dashboard/health-coach/page.tsx
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Calendar, Users, FileText, Clock } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function HealthCoachDashboard() {
    const supabase = createServerComponentClient({ cookies });

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        redirect('/login');
    }

    // Get health coach profile
    const { data: profile } = await supabase
        .from('profiles')
        .select('id, full_name, role')
        .eq('user_id', session.user.id)
        .single();

    if (profile?.role !== 'health_coach') {
        redirect('/dashboard');
    }

    // Get stats
    const { count: pendingRequests } = await supabase
        .from('consultation_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

    const { count: scheduledConsultations } = await supabase
        .from('consultation_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'scheduled');

    const { count: completedConsultations } = await supabase
        .from('consultation_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'completed');

    return (
        <div className="max-w-7xl mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold mb-8">Health Coach Dashboard</h1>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-white rounded-lg border p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-600 text-sm">Pending Requests</p>
                            <p className="text-2xl font-bold">{pendingRequests || 0}</p>
                        </div>
                        <Clock className="text-yellow-500" size={32} />
                    </div>
                </div>

                <div className="bg-white rounded-lg border p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-600 text-sm">Scheduled</p>
                            <p className="text-2xl font-bold">{scheduledConsultations || 0}</p>
                        </div>
                        <Calendar className="text-blue-500" size={32} />
                    </div>
                </div>

                <div className="bg-white rounded-lg border p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-600 text-sm">Completed</p>
                            <p className="text-2xl font-bold">{completedConsultations || 0}</p>
                        </div>
                        <FileText className="text-green-500" size={32} />
                    </div>
                </div>

                <div className="bg-white rounded-lg border p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-600 text-sm">Total Clients</p>
                            <p className="text-2xl font-bold">
                                {(completedConsultations || 0) + (scheduledConsultations || 0)}
                            </p>
                        </div>
                        <Users className="text-purple-500" size={32} />
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Link
                    href="/dashboard/health-coach/consultation-requests"
                    className="bg-white rounded-lg border p-6 hover:shadow-lg transition-shadow"
                >
                    <h2 className="text-xl font-semibold mb-2">Consultation Requests</h2>
                    <p className="text-gray-600 mb-4">
                        View and schedule pending consultation requests
                    </p>
                    <p className="text-blue-600 font-medium">
                        {pendingRequests || 0} requests waiting →
                    </p>
                </Link>

                <Link
                    href="/dashboard/health-coach/assign-nutritionists"
                    className="bg-white rounded-lg border p-6 hover:shadow-lg transition-shadow"
                >
                    <h2 className="text-xl font-semibold mb-2">Assign Nutritionists</h2>
                    <p className="text-gray-600 mb-4">
                        Match clients with the right nutritionists after consultation
                    </p>
                    <p className="text-blue-600 font-medium">
                        Manage assignments →
                    </p>
                </Link>
            </div>
        </div>
    );
}