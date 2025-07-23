// app/dashboard/my-clients/page.tsx
'use client';

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { UserCircle, UserPlus, UserMinus } from 'lucide-react';

// --- TYPE DEFINITIONS ---
type Client = {
    id: string; // This is the profile ID of the client
    full_name: string;
};

// --- MAIN COMPONENT ---
export default function MyClientsPage() {
    const supabase = createClientComponentClient();
    const [loading, setLoading] = useState(true);
    const [coachProfileId, setCoachProfileId] = useState<string | null>(null);
    const [enrolledClients, setEnrolledClients] = useState<Client[]>([]);
    const [clientRequests, setClientRequests] = useState<Client[]>([]);
    const [activeTab, setActiveTab] = useState<'clients' | 'requests'>('clients');

    const fetchData = useCallback(async (coachId: string) => {
        // Fetch enrolled clients from the coach_clients table
        const { data: enrolledData } = await supabase
            .from('coach_clients')
            .select('client:client_id(id, full_name)')
            .eq('coach_id', coachId);

        // Safely map and type the enrolled clients
        const enrolled: Client[] = enrolledData
            ?.map(item => {
                const client = item.client as unknown as Client;
                return client ? { id: client.id, full_name: client.full_name } : null;
            })
            .filter((client): client is Client => client !== null) || [];
        setEnrolledClients(enrolled);

        // Fetch clients who have booked appointments but are not yet enrolled
        const { data: appointmentData } = await supabase
            .from('appointments')
            .select('client:client_id(id, full_name)')
            .eq('professional_id', coachId);

        // Safely map and type the potential clients
        const potentialClients: Client[] = appointmentData
            ?.map(item => {
                const client = item.client as unknown as Client;
                return client ? { id: client.id, full_name: client.full_name } : null;
            })
            .filter((client): client is Client => client !== null) || [];

        // Filter out clients who are already enrolled
        const requests = potentialClients.filter(p =>
            !enrolled.some(e => e.id === p.id)
        );
        // Remove duplicates
        const uniqueRequests = Array.from(new Map(requests.map(item => [item.id, item])).values());
        setClientRequests(uniqueRequests);

        setLoading(false);
    }, [supabase]);

    useEffect(() => {
        const getCoachProfile = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('id')
                    .eq('user_id', user.id)
                    .single();
                if (profile) {
                    setCoachProfileId(profile.id);
                    await fetchData(profile.id);
                } else {
                    setLoading(false);
                }
            } else {
                setLoading(false);
            }
        };
        getCoachProfile();
    }, [supabase, fetchData]);

    // --- ENROLL / REMOVE LOGIC ---
    const handleEnrollClient = async (clientId: string) => {
        if (!coachProfileId) return;
        const { error } = await supabase
            .from('coach_clients')
            .insert({ coach_id: coachProfileId, client_id: clientId });

        if (error) {
            alert("Failed to enroll client: " + error.message);
        } else {
            alert("Client enrolled successfully!");
            await fetchData(coachProfileId); // Refresh the lists
        }
    };

    const handleRemoveClient = async (clientId: string) => {
        if (!coachProfileId || !window.confirm("Are you sure you want to remove this client?")) return;

        const { error } = await supabase
            .from('coach_clients')
            .delete()
            .match({ coach_id: coachProfileId, client_id: clientId });

        if (error) {
            alert("Failed to remove client: " + error.message);
        } else {
            alert("Client removed successfully.");
            await fetchData(coachProfileId); // Refresh the lists
        }
    };

    const renderClientList = (clients: Client[], isRequest: boolean) => {
        if (loading) return <p className="text-gray-500">Loading...</p>;
        if (clients.length === 0) {
            return (
                <div className="text-center text-gray-500 py-12">
                    <h2 className="text-2xl font-bold mb-2">
                        {isRequest ? 'No New Requests' : 'No Enrolled Clients'}
                    </h2>
                    <p>
                        {isRequest ? 'Clients who book an appointment with you will appear here.' : 'Enrolled clients will appear in this list.'}
                    </p>
                </div>
            );
        }

        return (
            <div className="space-y-4">
                {clients.map(client => (
                    <div key={client.id} className="flex items-center justify-between p-4 border-b border-gray-200">
                        <Link href={`/dashboard/my-clients/${client.id}/plans`} className="flex items-center gap-4 group">
                            <UserCircle size={40} className="text-gray-400" />
                            <div>
                                <p className="font-semibold text-lg group-hover:underline">{client.full_name}</p>
                            </div>
                        </Link>
                        {isRequest ? (
                            <button onClick={() => handleEnrollClient(client.id)} className="flex items-center gap-2 bg-green-100 text-green-800 font-semibold py-2 px-4 rounded-lg hover:bg-green-200">
                                <UserPlus size={18} /> Enroll
                            </button>
                        ) : (
                            <button onClick={() => handleRemoveClient(client.id)} className="flex items-center gap-2 bg-red-100 text-red-800 font-semibold py-2 px-4 rounded-lg hover:bg-red-200">
                                <UserMinus size={18} /> Remove
                            </button>
                        )}
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div className="max-w-5xl mx-auto text-gray-800">
            <h1 className="text-3xl font-bold mb-8">My Clients</h1>
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
                <div className="flex border-b border-gray-200">
                    <button onClick={() => setActiveTab('clients')} className={`py-4 px-6 font-semibold ${activeTab === 'clients' ? 'border-b-2 border-gray-800 text-gray-800' : 'text-gray-500'}`}>
                        My Clients ({enrolledClients.length})
                    </button>
                    <button onClick={() => setActiveTab('requests')} className={`py-4 px-6 font-semibold ${activeTab === 'requests' ? 'border-b-2 border-gray-800 text-gray-800' : 'text-gray-500'}`}>
                        Requests ({clientRequests.length})
                    </button>
                </div>
                <div className="p-8">
                    {activeTab === 'clients' ? renderClientList(enrolledClients, false) : renderClientList(clientRequests, true)}
                </div>
            </div>
        </div>
    );
}
