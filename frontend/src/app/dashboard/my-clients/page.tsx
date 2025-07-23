// app/dashboard/my-clients/page.tsx
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { UserCircle, ChevronRight } from 'lucide-react';

export const dynamic = 'force-dynamic';

type ClientProfile = {
    id: string;
    full_name: string;
    // We can add more fields like email later
};

type CoachClient = {
    client: ClientProfile;
};

export default async function MyClientsPage() {
    const supabase = createServerComponentClient({ cookies });

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        redirect('/login');
    }

    // Get the coach's profile to find their primary key ID
    const { data: coachProfile } = await supabase
        .from('profiles')
        .select('id, role')
        .eq('user_id', session.user.id)
        .single();

    if (!coachProfile || (coachProfile.role !== 'nutritionist' && coachProfile.role !== 'trainer')) {
        // Redirect if the user is not a coach
        return redirect('/dashboard');
    }

    // Fetch the list of clients linked to this coach
    const { data: clients, error } = await supabase
        .from('coach_clients')
        .select(`
            client:client_id (
                id,
                full_name
            )
        `)
        .eq('coach_id', coachProfile.id);

    if (error) {
        console.error("Error fetching clients:", error);
        return <div className="text-red-500 p-8">Error loading your clients.</div>;
    }

    const clientList = (clients as unknown as CoachClient[]) || [];

    return (
        <div className="max-w-5xl mx-auto text-gray-800">
            <h1 className="text-3xl font-bold mb-8">My Clients</h1>
            <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm">
                <div className="space-y-4">
                    {clientList.length > 0 ? (
                        clientList.map(({ client }) => (
                            <Link
                                href={`/dashboard/my-clients/${client.id}/plans`}
                                key={client.id}
                                className="flex items-center justify-between p-4 border-b border-gray-200 hover:bg-gray-50 rounded-lg transition-colors"
                            >
                                <div className="flex items-center gap-4">
                                    <UserCircle size={40} className="text-gray-400" />
                                    <div>
                                        <p className="font-semibold text-lg">{client.full_name}</p>
                                        {/* Placeholder for client status */}
                                        <p className="text-sm text-gray-500">Active Plan</p>
                                    </div>
                                </div>
                                <ChevronRight size={24} className="text-gray-400" />
                            </Link>
                        ))
                    ) : (
                        <div className="text-center text-gray-500 py-12">
                            <h2 className="text-2xl font-bold mb-2">No Clients Yet</h2>
                            <p>When a client enrolls with you, they will appear here.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
