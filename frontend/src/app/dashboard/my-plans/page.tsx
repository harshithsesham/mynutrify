// frontend/src/app/dashboard/my-plans/page.tsx
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { FileText, PlusCircle, Calendar, User, ChevronRight, Sparkles, Loader2 } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

export const dynamic = 'force-dynamic';

type Profile = {
    full_name: string;
    role?: string;
};

type NutritionPlan = {
    id: number;
    title: string;
    created_at: string;
    target_calories?: number;
    creator: Profile | null;
};

export default async function MyPlansPage() {
    const cookieStore = await cookies();
    const supabase = createServerComponentClient({ cookies: () => cookieStore as any });

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

    // Fetch data with creator details
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

    // Use a safety check for the cast
    const plans = data as unknown as NutritionPlan[] | null;

    if (error) {
        console.error("Error fetching plans:", error);
        return <div className="text-red-600 p-8">Error loading your plans: {error.message}</div>;
    }

    const allPlans = plans || [];

    // --- CRASH FIX: Defensive Filtering Logic ---
    // Ensure both `plan` and `plan.creator` are not null before accessing properties
    const coachPlans = allPlans.filter(plan =>
        plan.creator !== null && plan.creator.role !== 'client'
    );

    const myPlans = allPlans.filter(plan =>
        plan.creator !== null && plan.creator.full_name === clientProfile.full_name
    );
    // --- END CRASH FIX ---

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-6xl mx-auto px-0 sm:px-4 lg:px-6 py-6 sm:py-8">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <h1 className="text-4xl font-extrabold text-gray-900 mb-2">
                                My Nutrition Plans
                            </h1>
                            <p className="text-lg text-gray-600">
                                Manage your personalized meal plans and track your goals.
                            </p>
                        </div>
                        <Link
                            href="/dashboard/my-plans/create"
                            className="inline-flex items-center gap-2 bg-teal-600 text-white font-bold py-3 px-6 rounded-full hover:bg-teal-700 transition-all hover:shadow-lg group shadow-md"
                        >
                            <PlusCircle size={20} className="group-hover:rotate-90 transition-transform" />
                            Create New Plan
                        </Link>
                    </div>
                </div>

                {/* Stats Cards - Redesigned with Teal Accents */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12">
                    <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-lg">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-gray-600 text-sm font-medium">Total Plans</p>
                                <p className="text-3xl font-bold text-teal-600">{allPlans.length}</p>
                            </div>
                            <div className="w-12 h-12 bg-teal-50 rounded-xl flex items-center justify-center shadow-inner">
                                <FileText size={28} className="text-teal-600" />
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-lg">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-gray-600 text-sm font-medium">From Coaches</p>
                                <p className="text-3xl font-bold text-blue-600">{coachPlans.length}</p>
                            </div>
                            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center shadow-inner">
                                <User size={28} className="text-blue-600" />
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-lg">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-gray-600 text-sm font-medium">Created by Me</p>
                                <p className="text-3xl font-bold text-purple-600">{myPlans.length}</p>
                            </div>
                            <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center shadow-inner">
                                <Sparkles size={28} className="text-purple-600" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Plans Lists */}
                {allPlans.length > 0 ? (
                    <div className="space-y-12">
                        {/* Coach Created Plans */}
                        {coachPlans.length > 0 && (
                            <div>
                                <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2 border-b pb-2">
                                    <User size={24} className="text-blue-600" />
                                    Latest Plans from Your Professional
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {coachPlans.map((plan) => (
                                        <Link
                                            href={`/dashboard/my-plans/${plan.id}`}
                                            key={plan.id}
                                            // Redesigned Plan Card
                                            className="group bg-white p-6 rounded-2xl border-2 border-blue-100 hover:border-blue-300 shadow-md hover:shadow-xl transition-all block"
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex-1">
                                                    <h3 className="font-extrabold text-xl text-gray-900 group-hover:text-teal-600 transition-colors">
                                                        {plan.title}
                                                    </h3>
                                                    <p className="text-sm text-blue-600 font-semibold mb-2">
                                                        by {plan.creator?.full_name || 'Unknown Professional'}
                                                    </p>
                                                    <div className="flex items-center gap-4 text-sm text-gray-500 pt-2 border-t border-gray-100">
                                                        <span className="flex items-center gap-1">
                                                            <Calendar size={14} />
                                                            {format(new Date(plan.created_at), 'MMM dd, yyyy')}
                                                        </span>
                                                        {plan.target_calories && (
                                                            <span className="flex items-center gap-1 font-semibold text-teal-700">
                                                                <Sparkles size={14} />
                                                                {plan.target_calories} kcal
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <ChevronRight size={24} className="text-teal-500 group-hover:text-teal-700 group-hover:translate-x-1 transition-all flex-shrink-0" />
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* My Created Plans */}
                        {myPlans.length > 0 && (
                            <div>
                                <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2 border-b pb-2">
                                    <Sparkles size={24} className="text-purple-600" />
                                    Plans You Created
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {myPlans.map((plan) => (
                                        <Link
                                            href={`/dashboard/my-plans/${plan.id}`}
                                            key={plan.id}
                                            // Redesigned Plan Card
                                            className="group bg-white p-6 rounded-2xl border-2 border-purple-100 hover:border-purple-300 shadow-md hover:shadow-xl transition-all block"
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex-1">
                                                    <h3 className="font-extrabold text-xl text-gray-900 group-hover:text-teal-600 transition-colors">
                                                        {plan.title}
                                                    </h3>
                                                    <p className="text-sm text-purple-600 font-semibold mb-2">
                                                        Created {formatDistanceToNow(new Date(plan.created_at), { addSuffix: true })}
                                                    </p>
                                                    <div className="flex items-center gap-4 text-sm text-gray-500 pt-2 border-t border-gray-100">
                                                        <span className="flex items-center gap-1">
                                                            <Calendar size={14} />
                                                            {format(new Date(plan.created_at), 'MMM dd, yyyy')}
                                                        </span>
                                                        {plan.target_calories && (
                                                            <span className="flex items-center gap-1 font-semibold text-teal-700">
                                                                <Sparkles size={14} />
                                                                {plan.target_calories} kcal
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <ChevronRight size={24} className="text-teal-500 group-hover:text-teal-700 group-hover:translate-x-1 transition-all flex-shrink-0" />
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    /* Empty State - Redesigned */
                    <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center shadow-xl">
                        <div className="w-24 h-24 bg-teal-50 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                            <FileText size={40} className="text-teal-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-800 mb-3">No Nutrition Plans Yet</h2>
                        <p className="text-gray-600 mb-8 max-w-lg mx-auto">
                            Start your nutrition journey by creating your first meal plan or wait for your professional to assign one to you!
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <Link
                                href="/dashboard/my-plans/create"
                                className="inline-flex items-center justify-center gap-2 bg-teal-600 text-white font-bold py-3 px-6 rounded-full hover:bg-teal-700 transition-colors shadow-lg"
                            >
                                <PlusCircle size={20} />
                                Create Your First Plan
                            </Link>
                            <Link
                                href="/dashboard/my-nutritionist"
                                className="inline-flex items-center justify-center gap-2 bg-white text-gray-800 font-bold py-3 px-6 rounded-full border border-gray-300 hover:bg-gray-50 transition-colors"
                            >
                                Contact My Professional
                            </Link>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}