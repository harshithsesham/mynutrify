// app/dashboard/health-coach/test-consultations/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

type ConsultationRequest = {
    id: string;
    full_name: string;
    email: string;
    phone: string;
    age: number;
    gender: string;
    health_goals: string;
    current_challenges: string | null;
    preferred_days: string[] | null;
    preferred_time_slots: string[] | null;
    additional_info: string | null;
    status: string;
    created_at: string;
    updated_at: string;
    scheduled_date: string | null;
    scheduled_time: string | null;
    scheduled_by: string | null;
    meeting_type: string | null;
    pre_consultation_notes: string | null;
    meeting_link: string | null;
    completed_at: string | null;
    assigned_nutritionist_id: string | null;
};

export default function TestConsultationsPage() {
    const supabase = createClientComponentClient();
    const [data, setData] = useState<ConsultationRequest[] | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Direct query to consultation_requests
                const { data: consultations, error: consultError } = await supabase
                    .from('consultation_requests')
                    .select('*')
                    .order('created_at', { ascending: false });

                if (consultError) {
                    setError(consultError.message);
                } else {
                    setData(consultations);
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Unknown error');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [supabase]);

    if (loading) return <div>Loading...</div>;
    if (error) return <div>Error: {error}</div>;

    return (
        <div className="p-8">
            <h1 className="text-2xl font-bold mb-4">Raw Consultation Requests Data</h1>

            <div className="mb-4">
                <p>Total records: {data?.length || 0}</p>
            </div>

            <div className="overflow-x-auto">
                <table className="min-w-full border-collapse border border-gray-300">
                    <thead>
                    <tr className="bg-gray-100">
                        <th className="border border-gray-300 px-2 py-1">ID</th>
                        <th className="border border-gray-300 px-2 py-1">Status</th>
                        <th className="border border-gray-300 px-2 py-1">Name</th>
                        <th className="border border-gray-300 px-2 py-1">Email</th>
                        <th className="border border-gray-300 px-2 py-1">Scheduled Date</th>
                        <th className="border border-gray-300 px-2 py-1">Assigned Nutritionist</th>
                    </tr>
                    </thead>
                    <tbody>
                    {data?.map((row) => (
                        <tr key={row.id}>
                            <td className="border border-gray-300 px-2 py-1 text-xs">{row.id.slice(0, 8)}...</td>
                            <td className="border border-gray-300 px-2 py-1">
                                    <span className={`px-2 py-1 rounded text-xs ${
                                        row.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                                            row.status === 'completed' ? 'bg-green-100 text-green-800' :
                                                'bg-gray-100 text-gray-800'
                                    }`}>
                                        {row.status}
                                    </span>
                            </td>
                            <td className="border border-gray-300 px-2 py-1">{row.full_name}</td>
                            <td className="border border-gray-300 px-2 py-1">{row.email}</td>
                            <td className="border border-gray-300 px-2 py-1">
                                {row.scheduled_date || 'N/A'}
                            </td>
                            <td className="border border-gray-300 px-2 py-1">
                                {row.assigned_nutritionist_id ? '✅ Assigned' : '❌ Not assigned'}
                            </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>

            <div className="mt-8">
                <h2 className="text-xl font-bold mb-2">Filtered Results</h2>

                <div className="mb-4">
                    <h3 className="font-semibold">Scheduled without nutritionist:</h3>
                    <p>{data?.filter((r) => r.status === 'scheduled' && !r.assigned_nutritionist_id).length || 0} records</p>
                </div>

                <div className="mb-4">
                    <h3 className="font-semibold">Completed without nutritionist:</h3>
                    <p>{data?.filter((r) => r.status === 'completed' && !r.assigned_nutritionist_id).length || 0} records</p>
                </div>
            </div>
        </div>
    );
}