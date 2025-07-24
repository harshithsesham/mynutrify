// app/dashboard/my-plans/page.tsx
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { FileText, PlusCircle, Calendar, User, ChevronRight, Sparkles } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

export const dynamic = 'force-dynamic';

type NutritionPlan = {
    id: number;
    title: string;
    created_at: string;
    target_calories?: number;
    creator: {
        full_name: string;
        role?: string;
    } | null;
};

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
        return redirect('/dashboard');
    }

    const { data, error } = await supabase
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

    const plans = data as unknown as NutritionPlan[] | null;

    if (error) {
        console.error("Error fetching plans:", error);
        return <div className="text-red-500 p-8">Error loading your plans.</div>;
    }

    // Separate plans by creator
    const coachPlans = plans?.filter(plan => plan.creator?.role !== 'client') || [];
    const myPlans = plans?.filter(plan => plan.creator?.full_name === clientProfile.full_name) || [];

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <h1 className="text-3xl sm:text-4xl font-bold text-gray-800 mb-2">
                                My Nutrition Plans
                            </h1>
                            <p className="text-gray-600">
                                Manage your meal plans and track your nutrition journey
                            </p>
                        </div>
                        <Link
                            href="/dashboard/my-plans/create"
                            className="inline-flex items-center gap-2 bg-gray-800 text-white font-bold py-3 px-6 rounded-lg hover:bg-gray-700 transition-all hover:shadow-lg group"
                        >
                            <PlusCircle size={20} className="group-hover:rotate-90 transition-transform" />
                            Create New Plan
                        </Link>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                    <div className="bg-white rounded-xl p-6 border border-gray-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-gray-600 text-sm">Total Plans</p>
                                <p className="text-2xl font-bold text-gray-800">{plans?.length || 0}</p>
                            </div>
                            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                                <FileText size={24} className="text-gray-600" />
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl p-6 border border-gray-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-gray-600 text-sm">From Coaches</p>
                                <p className="text-2xl font-bold text-gray-800">{coachPlans.length}</p>
                            </div>
                            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                                <User size={24} className="text-blue-600" />
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl p-6 border border-gray-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-gray-600 text-sm">Created by Me</p>
                                <p className="text-2xl font-bold text-gray-800">{myPlans.length}</p>
                            </div>
                            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                                <Sparkles size={24} className="text-green-600" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Plans Lists */}
                {plans && plans.length > 0 ? (
                    <div className="space-y-8">
                        {/* Coach Created Plans */}
                        {coachPlans.length > 0 && (
                            <div>
                                <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                                    <User size={20} />
                                    Plans from Coaches
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {coachPlans.map((plan) => (
                                        <Link
                                            href={`/dashboard/my-plans/${plan.id}`}
                                            key={plan.id}
                                            className="group bg-white p-6 rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-lg transition-all"
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-3 mb-3">
                                                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                                            <FileText size={20} className="text-blue-600" />
                                                        </div>
                                                        <div className="flex-1">
                                                            <h3 className="font-semibold text-lg text-gray-800 group-hover:text-gray-900">
                                                                {plan.title}
                                                            </h3>
                                                            <p className="text-sm text-gray-600">
                                                                by {plan.creator?.full_name || 'Unknown Coach'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-4 text-sm text-gray-500">
                                                        <span className="flex items-center gap-1">
                                                            <Calendar size={14} />
                                                            {format(new Date(plan.created_at), 'MMM dd, yyyy')}
                                                        </span>
                                                        {plan.target_calories && (
                                                            <span className="flex items-center gap-1">
                                                                <Sparkles size={14} />
                                                                {plan.target_calories} kcal
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <ChevronRight size={20} className="text-gray-400 group-hover:text-gray-600 group-hover:translate-x-1 transition-all mt-2" />
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* My Created Plans */}
                        {myPlans.length > 0 && (
                            <div>
                                <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                                    <Sparkles size={20} />
                                    My Created Plans
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {myPlans.map((plan) => (
                                        <Link
                                            href={`/dashboard/my-plans/${plan.id}`}
                                            key={plan.id}
                                            className="group bg-white p-6 rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-lg transition-all"
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-3 mb-3">
                                                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                                                            <FileText size={20} className="text-green-600" />
                                                        </div>
                                                        <div className="flex-1">
                                                            <h3 className="font-semibold text-lg text-gray-800 group-hover:text-gray-900">
                                                                {plan.title}
                                                            </h3>
                                                            <p className="text-sm text-gray-600">
                                                                Created {formatDistanceToNow(new Date(plan.created_at), { addSuffix: true })}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-4 text-sm text-gray-500">
                                                        <span className="flex items-center gap-1">
                                                            <Calendar size={14} />
                                                            {format(new Date(plan.created_at), 'MMM dd, yyyy')}
                                                        </span>
                                                        {plan.target_calories && (
                                                            <span className="flex items-center gap-1">
                                                                <Sparkles size={14} />
                                                                {plan.target_calories} kcal
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <ChevronRight size={20} className="text-gray-400 group-hover:text-gray-600 group-hover:translate-x-1 transition-all mt-2" />
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    /* Empty State */
                    <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
                        <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <FileText size={40} className="text-gray-400" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-800 mb-3">No Nutrition Plans Yet</h2>
                        <p className="text-gray-600 mb-8 max-w-md mx-auto">
                            Start your nutrition journey by creating your first meal plan or wait for your coach to assign one.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <Link
                                href="/dashboard/my-plans/create"
                                className="inline-flex items-center justify-center gap-2 bg-gray-800 text-white font-bold py-3 px-6 rounded-lg hover:bg-gray-700 transition-colors"
                            >
                                <PlusCircle size={20} />
                                Create Your First Plan
                            </Link>
                            <Link
                                href="/dashboard"
                                className="inline-flex items-center justify-center gap-2 bg-white text-gray-800 font-bold py-3 px-6 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
                            >
                                Browse Coaches
                            </Link>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}