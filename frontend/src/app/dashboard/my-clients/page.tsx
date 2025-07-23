// app/dashboard/my-clients/page.tsx
'use client';

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useCallback, useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { UserCircle, MoreVertical, UserPlus, UserMinus, XCircle } from 'lucide-react';

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
    const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const fetchData = useCallback(async (coachId: string) => {
        setLoading(true);

        // 1. Fetch all clients officially enrolled with the coach
        const { data: enrolledData } = await supabase
            .from('coach_clients')
            .select('client:client_id(id, full_name)')
            .eq('coach_id', coachId);

        // Safely map and type the enrolled clients, filtering out any nulls or invalid entries
        const enrolled: Client[] = enrolledData
            ?.map(item => {
                const client = item.client as unknown as Client;
                return client && client.id && client.full_name ? client : null;
            })
            .filter((client): client is Client => client !== null) || [];
        setEnrolledClients(enrolled);

        // 2. Fetch all clients who have unhandled appointment requests
        const { data: requestData } = await supabase
            .from('appointments')
            .select('client:client_id(id, full_name)')
            .eq('professional_id', coachId)
            .eq('is_request_handled', false); // Only get unhandled requests

        const potentialClients: Client[] = requestData
            ?.map(item => {
                const client = item.client as unknown as Client;
                return client && client.id && client.full_name ? client : null;
            })
            .filter((client): client is Client => client !== null) || [];

        const enrolledClientIds = new Set(enrolled.map(c => c.id));

        // 3. Filter out clients who are already enrolled
        const requests = potentialClients.filter(p => !enrolledClientIds.has(p.id));

        const uniqueRequests = Array.from(new Map(requests.map(item => [item.id, item])).values());
        setClientRequests(uniqueRequests);

        setLoading(false);
    }, [supabase]);

    useEffect(() => {
        const getCoachProfile = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profile } = await supabase.from('profiles').select('id').eq('user_id', user.id).single();
                if (profile) {
                    setCoachProfileId(profile.id);
                    await fetchData(profile.id);
                } else setLoading(false);
            } else setLoading(false);
        };
        getCoachProfile();
    }, [supabase, fetchData]);

    // --- CLICK OUTSIDE HOOK for dropdown ---
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setOpenDropdownId(null);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [dropdownRef]);

    // --- CLIENT MANAGEMENT LOGIC ---
    const handleEnrollClient = async (clientId: string) => {
        if (!coachProfileId) return;
        setOpenDropdownId(null);
        await supabase.from('coach_clients').insert({ coach_id: coachProfileId, client_id: clientId });
        await handleRemoveRequest(clientId, false); // Also mark requests as handled
        alert("Client enrolled successfully!");
        await fetchData(coachProfileId);
    };

    const handleRemoveClient = async (clientId: string) => {
        if (!coachProfileId || !window.confirm("Are you sure you want to remove this client?")) return;
        setOpenDropdownId(null);
        await supabase.from('coach_clients').delete().match({ coach_id: coachProfileId, client_id: clientId });
        alert("Client removed successfully.");
        await fetchData(coachProfileId);
    };

    const handleRemoveRequest = async (clientId: string, showAlert = true) => {
        if (!coachProfileId) return;
        setOpenDropdownId(null);
        // Mark all of this client's appointments with this coach as handled
        const { error } = await supabase
            .from('appointments')
            .update({ is_request_handled: true })
            .match({ professional_id: coachProfileId, client_id: clientId });

        if (error) alert("Failed to remove request: " + error.message);
        else if (showAlert) {
            alert("Request removed.");
            await fetchData(coachProfileId);
        }
    };

    const renderClientList = (clients: Client[], isRequest: boolean) => {
        if (loading) return <p className="text-gray-500 p-4 text-center">Loading...</p>;
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
                    <div key={client.id} className="flex items-center justify-between p-4 border-b border-gray-200 last:border-b-0">
                        <Link href={`/dashboard/my-clients/${client.id}/plans`} className="flex items-center gap-4 group">
                            <UserCircle size={40} className="text-gray-400" />
                            <div>
                                <p className="font-semibold text-lg group-hover:underline">{client.full_name}</p>
                            </div>
                        </Link>
                        <div className="relative" ref={openDropdownId === client.id ? dropdownRef : null}>
                            <button onClick={() => setOpenDropdownId(openDropdownId === client.id ? null : client.id)} className="p-2 rounded-full hover:bg-gray-100">
                                <MoreVertical size={20} />
                            </button>
                            {openDropdownId === client.id && (
                                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                                    {isRequest ? (
                                        <>
                                            <button onClick={() => handleEnrollClient(client.id)} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                                                <UserPlus size={16} /> Enroll Client
                                            </button>
                                            <button onClick={() => handleRemoveRequest(client.id)} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                                                <XCircle size={16} /> Remove Request
                                            </button>
                                        </>
                                    ) : (
                                        <button onClick={() => handleRemoveClient(client.id)} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50">
                                            <UserMinus size={16} /> Remove Client
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
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
                <div className="p-4">
                    {activeTab === 'clients' ? renderClientList(enrolledClients, false) : renderClientList(clientRequests, true)}
                </div>
            </div>
        </div>
    );
}
