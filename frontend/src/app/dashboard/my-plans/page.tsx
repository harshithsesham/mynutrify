// src/app/dashboard/my-plans/page.tsx
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { FileText, PlusCircle, Calendar, User, ChevronRight, Sparkles } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

export const dynamic = 'force-dynamic';

export default async function MyPlansPage() {
    const supabase = createServerComponentClient({ cookies });

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        redirect('/login');
    }

    const { data: clientProfile } = await supabase
        .from('profiles')
        .select('id, role, full_name')
        .eq('user_id', session.user.id)
        .single();

    if (!clientProfile) {
        // If no profile, we can't show plans. Redirect to dashboard.
        redirect('/dashboard');
    }

    // Fetch plans assigned to this user
    const { data: plans, error } = await supabase
        .from('nutrition_plans')
        .select(`
            id,
            title,
            created_at,
            target_calories,
            creator:created_by_id (
                full_name,
                role
            )
        `)
        .eq('assigned_to_id', clientProfile.id)
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Error fetching plans:", error);
        return (
            <div className="p-8 text-center text-red-600 bg-red-50 rounded-lg">
                Error loading your plans: {error.message}
            </div>
        );
    }

    // Separate plans by creator
    const coachPlans = plans?.filter(plan => (plan.creator as any)?.role !== 'client') || [];
    const myPlans = plans?.filter(plan => (plan.creator as any)?.full_name === clientProfile.full_name) || [];

    // Helper to render a plan card
    const PlanCard = ({ plan }: { plan: any }) => (
        <Link
            href={`/dashboard/my-plans/${plan.id}`}
            className="group bg-white p-6 rounded-xl border border-gray-200 hover:border-indigo-300 hover:shadow-lg transition-all"
        >
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center">
                            <FileText size={20} className="text-indigo-600" />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-semibold text-lg text-gray-800 group-hover:text-indigo-600 transition-colors">
                                {plan.title}
                            </h3>
                            <p className="text-sm text-gray-500">
                                {format(new Date(plan.created_at), 'MMM dd, yyyy')}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                        {plan.target_calories > 0 && (
                            <span className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded text-xs font-medium">
                                <Sparkles size={12} className="text-amber-500" />
                                {plan.target_calories} kcal
                            </span>
                        )}
                        <span className="text-xs">
                            {formatDistanceToNow(new Date(plan.created_at), { addSuffix: true })}
                        </span>
                    </div>
                </div>
                <ChevronRight size={20} className="text-gray-300 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all mt-2" />
            </div>
        </Link>
    );

    return (
        <div className="min-h-screen bg-gray-50/50">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-1">
                            My Nutrition Plans
                        </h1>
                        <p className="text-gray-500">
                            View and manage your daily meal plans
                        </p>
                    </div>
                    <Link
                        href="/dashboard/my-plans/create"
                        className="inline-flex items-center gap-2 bg-gray-900 text-white font-semibold py-2.5 px-5 rounded-lg hover:bg-gray-800 transition-all shadow-sm hover:shadow-md"
                    >
                        <PlusCircle size={18} />
                        Create New Plan
                    </Link>
                </div>

                <div className="space-y-10">
                    {/* Empty State */}
                    {plans?.length === 0 && (
                        <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-12 text-center">
                            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                <FileText size={32} className="text-gray-400" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-1">No plans found</h3>
                            <p className="text-gray-500 mb-6">Get started by creating your first meal plan.</p>
                            <Link
                                href="/dashboard/my-plans/create"
                                className="text-indigo-600 font-medium hover:text-indigo-800 hover:underline"
                            >
                                Create a Plan &rarr;
                            </Link>
                        </div>
                    )}

                    {/* Coach Plans Section */}
                    {coachPlans.length > 0 && (
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                <User size={20} className="text-blue-500" />
                                Assigned by Coaches
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {coachPlans.map((plan) => <PlanCard key={plan.id} plan={plan} />)}
                            </div>
                        </div>
                    )}

                    {/* My Plans Section */}
                    {myPlans.length > 0 && (
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                <Sparkles size={20} className="text-amber-500" />
                                Created by Me
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {myPlans.map((plan) => <PlanCard key={plan.id} plan={plan} />)}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}