// app/dashboard/my-plans/page.tsx
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { FileText, PlusCircle } from 'lucide-react';
import { format } from 'date-fns';

export const dynamic = 'force-dynamic';

// This type is adjusted to match the data shape Supabase returns for relationships
type NutritionPlan = {
    id: number;
    title: string;
    created_at: string;
    creator: {
        full_name: string;
    } | null; // A single object or null
};

export default async function MyPlansPage() {
    const supabase = createServerComponentClient({ cookies });

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        redirect('/login');
    }

    // Get the client's profile to find their primary key ID
    const { data: clientProfile } = await supabase
        .from('profiles')
        .select('id, role')
        .eq('user_id', session.user.id)
        .single();

    if (!clientProfile) {
        return redirect('/dashboard');
    }

    // Fetch all nutrition plans assigned to this client
    const { data, error } = await supabase
        .from('nutrition_plans')
        .select(`
            id,
            title,
            created_at,
            creator:created_by_id (
                full_name
            )
        `)
        .eq('assigned_to_id', clientProfile.id)
        .order('created_at', { ascending: false });

    const plans = data as unknown as NutritionPlan[] | null;

    if (error) {
        console.error("Error fetching plans:", error);
        return <div className="text-red-500 p-8">Error loading your plans.</div>;
    }

    return (
        <div className="max-w-5xl mx-auto text-gray-800">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold">My Nutrition Plans</h1>
                <Link href="/dashboard/my-plans/create" className="bg-gray-800 text-white font-bold py-2 px-4 rounded-lg hover:bg-gray-700 flex items-center gap-2">
                    <PlusCircle size={20} /> Create My Own Plan
                </Link>
            </div>
            <div className="space-y-6">
                {plans && plans.length > 0 ? (
                    plans.map((plan) => (
                        <Link
                            href={`/dashboard/my-plans/${plan.id}`}
                            key={plan.id}
                            className="block bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
                        >
                            <div className="flex items-center gap-4">
                                <FileText size={32} className="text-gray-400" />
                                <div>
                                    <p className="font-semibold text-lg">{plan.title}</p>
                                    <p className="text-sm text-gray-500">
                                        Created by {plan.creator?.full_name || 'Unknown'} on {format(new Date(plan.created_at), 'dd MMM yyyy')}
                                    </p>
                                </div>
                            </div>
                        </Link>
                    ))
                ) : (
                    <div className="text-center text-gray-500 py-12 bg-gray-50 rounded-2xl border border-gray-200">
                        <h2 className="text-2xl font-bold mb-2">No Plans Yet</h2>
                        <p>Plans assigned by your coach or created by you will appear here.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
