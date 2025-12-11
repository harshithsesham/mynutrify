// app/dashboard/health-coach/page.tsx
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Calendar, Users, FileText, Clock, UserCheck, UserPlus, BarChart, MessageSquare } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function HealthCoachDashboard() {
    const cookieStore = await cookies();
    const supabase = createServerComponentClient({ cookies: () => cookieStore as any });

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
        .in('status', ['scheduled', 'confirmed']); // Include confirmed as scheduled/ready

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

    // Consolidated client count
    const totalClientsHelped = (completedConsultations || 0) + (scheduledConsultations || 0);
    const assignmentRate = totalClientsHelped > 0 ? Math.round((assignedClientsCount / totalClientsHelped) * 100) : 0;


    // --- Helper Component for Stat Cards ---
    const StatCard = ({ title, value, icon: Icon, colorClass, link, linkText }: any) => (
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-md hover:shadow-xl transition-all group">
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-gray-600 text-sm font-medium uppercase tracking-wider mb-1">{title}</p>
                    <p className={`text-3xl font-bold ${colorClass}`}>{value}</p>
                </div>
                <div className={`w-12 h-12 ${colorClass.replace('text-', 'bg-').replace('-600', '-100')} rounded-xl flex items-center justify-center transition-colors shadow-inner`}>
                    <Icon size={24} className={colorClass} />
                </div>
            </div>
            {link && (
                <Link href={link} className="mt-4 block text-sm font-semibold text-teal-600 hover:text-teal-700 transition-colors">
                    {linkText} →
                </Link>
            )}
        </div>
    );
    // ----------------------------------------


    return (
        <div className="max-w-7xl mx-auto px-0 py-8">
            <div className="mb-8">
                <h1 className="text-4xl font-extrabold text-gray-900 mb-2">Health Coach Overview</h1>
                <p className="text-lg text-gray-600">Welcome back, {profile.full_name}! Monitor your client flow.</p>
            </div>

            {/* Stats Grid - Focused on Actionable Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                <StatCard
                    title="Awaiting Review"
                    value={pendingRequests || 0}
                    icon={Clock}
                    colorClass="text-orange-600"
                    link="/dashboard/health-coach/consultation-requests"
                    linkText="Review Requests"
                />
                <StatCard
                    title="Active Assignments"
                    value={assignedClientsCount}
                    icon={UserCheck}
                    colorClass="text-teal-600"
                    link="/dashboard/health-coach/assign-nutritionists"
                    linkText="Manage Assignments"
                />
                <StatCard
                    title="Scheduled Consults"
                    value={scheduledConsultations || 0}
                    icon={Calendar}
                    colorClass="text-blue-600"
                    link="/dashboard/my-appointments"
                    linkText="View Calendar"
                />
                <StatCard
                    title="Total Clients Helped"
                    value={totalClientsHelped}
                    icon={Users}
                    colorClass="text-gray-800"
                    link="/dashboard/health-coach/analytics"
                    linkText="View Analytics"
                />
            </div>

            {/* Quick Actions Grid - Clear CTA blocks */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* 1. Requests Card */}
                <Link
                    href="/dashboard/health-coach/consultation-requests"
                    className="bg-white rounded-2xl border-2 border-orange-200 p-8 shadow-xl hover:shadow-2xl transition-all hover:border-orange-400 group flex items-start gap-6"
                >
                    <div className="w-16 h-16 bg-orange-100 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-orange-200 transition-colors">
                        <Clock size={32} className="text-orange-600" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold mb-2 text-gray-900">Consultation Queue</h2>
                        <p className="text-gray-600 mb-4">
                            Review and schedule free consultations with new potential clients.
                        </p>
                        <p className="text-lg font-bold text-orange-600">
                            {pendingRequests || 0} Requests Waiting →
                        </p>
                    </div>
                </Link>

                {/* 2. Assignment Card */}
                <Link
                    href="/dashboard/health-coach/assign-nutritionists"
                    className="bg-white rounded-2xl border-2 border-teal-200 p-8 shadow-xl hover:shadow-2xl transition-all hover:border-teal-400 group flex items-start gap-6"
                >
                    <div className="w-16 h-16 bg-teal-100 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-teal-200 transition-colors">
                        <UserPlus size={32} className="text-teal-600" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold mb-2 text-gray-900">Assign & Manage</h2>
                        <p className="text-gray-600 mb-4">
                            Match post-consultation clients with the best-fit nutritionists.
                        </p>
                        <p className="text-lg font-bold text-teal-600">
                            {assignedClientsCount} Active Assignments →
                        </p>
                    </div>
                </Link>

                {/* 3. Analytics Card */}
                <Link
                    href="/dashboard/health-coach/analytics"
                    className="bg-white rounded-2xl border-2 border-gray-200 p-8 shadow-md hover:shadow-xl transition-all hover:border-blue-400 group flex items-start gap-6 col-span-1 md:col-span-2 lg:col-span-1"
                >
                    <div className="w-16 h-16 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-blue-200 transition-colors">
                        <BarChart size={32} className="text-blue-600" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold mb-2 text-gray-900">Performance & Analytics</h2>
                        <p className="text-gray-600 mb-4">
                            Review platform statistics, assignment rates ({assignmentRate}%), and team performance.
                        </p>
                        <p className="text-lg font-bold text-blue-600">
                            View Detailed Reports →
                        </p>
                    </div>
                </Link>
            </div>
        </div>
    );
}