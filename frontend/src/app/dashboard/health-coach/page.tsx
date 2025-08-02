// app/dashboard/health-coach/page.tsx (Updated)
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Calendar, Users, FileText, Clock, UserCheck } from 'lucide-react';

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

    // Get health coach ID
    const { data: healthCoach } = await supabase
        .from('health_coaches')
        .select('id')
        .eq('profile_id', profile.id)
        .single();

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

    // Get assigned clients count
    let assignedClientsCount = 0;
    if (healthCoach) {
        const { count: activeAssignments } = await supabase
            .from('nutritionist_assignments')
            .select('*', { count: 'exact', head: true })
            .eq('assigned_by', healthCoach.id)
            .eq('status', 'active');

        assignedClientsCount = activeAssignments || 0;
    }

    return (
        <div className="max-w-7xl mx-auto px-4 py-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-800 mb-2">Health Coach Dashboard</h1>
                <p className="text-gray-600">Welcome back, {profile.full_name}! Here&apos;s your overview.</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-600 text-sm">Pending Requests</p>
                            <p className="text-2xl font-bold text-yellow-600">{pendingRequests || 0}</p>
                        </div>
                        <Clock className="text-yellow-500" size={32} />
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-600 text-sm">Scheduled</p>
                            <p className="text-2xl font-bold text-blue-600">{scheduledConsultations || 0}</p>
                        </div>
                        <Calendar className="text-blue-500" size={32} />
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-600 text-sm">Completed</p>
                            <p className="text-2xl font-bold text-green-600">{completedConsultations || 0}</p>
                        </div>
                        <FileText className="text-green-500" size={32} />
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-600 text-sm">Assigned Clients</p>
                            <p className="text-2xl font-bold text-purple-600">{assignedClientsCount}</p>
                        </div>
                        <UserCheck className="text-purple-500" size={32} />
                    </div>
                </div>
            </div>

            {/* Quick Actions Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Link
                    href="/dashboard/health-coach/consultation-requests"
                    className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-all hover:border-gray-300 group"
                >
                    <div className="flex items-start justify-between mb-4">
                        <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center group-hover:bg-yellow-200 transition-colors">
                            <Clock size={24} className="text-yellow-600" />
                        </div>
                        {pendingRequests && pendingRequests > 0 && (
                            <span className="bg-yellow-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                                {pendingRequests}
                            </span>
                        )}
                    </div>
                    <h2 className="text-xl font-semibold mb-2 group-hover:text-gray-900">Consultation Requests</h2>
                    <p className="text-gray-600 mb-4">
                        View and schedule pending consultation requests from potential clients
                    </p>
                    <p className="text-blue-600 font-medium group-hover:text-blue-700">
                        {pendingRequests || 0} requests waiting →
                    </p>
                </Link>

                <Link
                    href="/dashboard/health-coach/assign-nutritionists"
                    className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-all hover:border-gray-300 group"
                >
                    <div className="flex items-start justify-between mb-4">
                        <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                            <UserCheck size={24} className="text-blue-600" />
                        </div>
                        {assignedClientsCount > 0 && (
                            <span className="bg-blue-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                                {assignedClientsCount}
                            </span>
                        )}
                    </div>
                    <h2 className="text-xl font-semibold mb-2 group-hover:text-gray-900">Assign & Manage</h2>
                    <p className="text-gray-600 mb-4">
                        Assign clients to nutritionists and manage existing assignments
                    </p>
                    <p className="text-blue-600 font-medium group-hover:text-blue-700">
                        {assignedClientsCount} active assignments →
                    </p>
                </Link>

                <Link
                    href="/dashboard/health-coach/analytics"
                    className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-all hover:border-gray-300 group"
                >
                    <div className="flex items-start justify-between mb-4">
                        <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center group-hover:bg-green-200 transition-colors">
                            <FileText size={24} className="text-green-600" />
                        </div>
                    </div>
                    <h2 className="text-xl font-semibold mb-2 group-hover:text-gray-900">Analytics</h2>
                    <p className="text-gray-600 mb-4">
                        View reports and analytics on consultation success rates
                    </p>
                    <p className="text-blue-600 font-medium group-hover:text-blue-700">
                        View insights →
                    </p>
                </Link>

                <Link
                    href="/dashboard/my-appointments"
                    className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-all hover:border-gray-300 group"
                >
                    <div className="flex items-start justify-between mb-4">
                        <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center group-hover:bg-indigo-200 transition-colors">
                            <Calendar size={24} className="text-indigo-600" />
                        </div>
                        {scheduledConsultations && scheduledConsultations > 0 && (
                            <span className="bg-indigo-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                                {scheduledConsultations}
                            </span>
                        )}
                    </div>
                    <h2 className="text-xl font-semibold mb-2 group-hover:text-gray-900">My Calendar</h2>
                    <p className="text-gray-600 mb-4">
                        View your scheduled consultations and appointments
                    </p>
                    <p className="text-blue-600 font-medium group-hover:text-blue-700">
                        View schedule →
                    </p>
                </Link>

                <Link
                    href="/dashboard/messages"
                    className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-all hover:border-gray-300 group"
                >
                    <div className="flex items-start justify-between mb-4">
                        <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center group-hover:bg-gray-200 transition-colors">
                            <Users size={24} className="text-gray-600" />
                        </div>
                    </div>
                    <h2 className="text-xl font-semibold mb-2 group-hover:text-gray-900">Messages</h2>
                    <p className="text-gray-600 mb-4">
                        Communicate with clients and nutritionists
                    </p>
                    <p className="text-blue-600 font-medium group-hover:text-blue-700">
                        Open messages →
                    </p>
                </Link>
            </div>

            {/* Recent Activity */}
            <div className="mt-8">
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold mb-4">Quick Stats</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                        <div className="p-4 bg-gray-50 rounded-lg">
                            <p className="text-2xl font-bold text-gray-800">
                                {(completedConsultations || 0) + (scheduledConsultations || 0)}
                            </p>
                            <p className="text-sm text-gray-600">Total Clients Helped</p>
                        </div>
                        <div className="p-4 bg-gray-50 rounded-lg">
                            <p className="text-2xl font-bold text-gray-800">{assignedClientsCount}</p>
                            <p className="text-sm text-gray-600">Active Assignments</p>
                        </div>
                        <div className="p-4 bg-gray-50 rounded-lg">
                            <p className="text-2xl font-bold text-gray-800">{pendingRequests || 0}</p>
                            <p className="text-sm text-gray-600">Pending Reviews</p>
                        </div>
                        <div className="p-4 bg-gray-50 rounded-lg">
                            <p className="text-2xl font-bold text-gray-800">
                                {completedConsultations ? Math.round((assignedClientsCount / completedConsultations) * 100) || 0 : 0}%
                            </p>
                            <p className="text-sm text-gray-600">Assignment Rate</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}