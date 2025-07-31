// app/dashboard/health-coach/assign-nutritionists/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { User, Users, Calendar, Clock, CheckCircle, AlertCircle, Search } from 'lucide-react';
import { format, parseISO } from 'date-fns';

type Client = {
    id: string;
    full_name: string;
    email: string;
    age?: number;
    gender?: string;
    health_goals?: string;
    current_challenges?: string;
    consultation_completed_at?: string;
    assigned_nutritionist?: {
        id: string;
        full_name: string;
    };
};

type Nutritionist = {
    id: string;
    profile_id: string;
    full_name: string;
    email: string;
    specializations: string[];
    hourly_rate: number;
    bio?: string;
    timezone: string;
    active_clients_count: number;
};

type ConsultationRequest = {
    id: string;
    client_id: string;
    client_name: string;
    client_email: string;
    health_goals: string;
    current_challenges: string;
    status: string;
    created_at: string;
    scheduled_date?: string;
    completed_at?: string;
};

export default function AssignNutritionistsPage() {
    const supabase = createClientComponentClient();
    const [loading, setLoading] = useState(true);
    const [consultationRequests, setConsultationRequests] = useState<ConsultationRequest[]>([]);
    const [nutritionists, setNutritionists] = useState<Nutritionist[]>([]);
    const [selectedClient, setSelectedClient] = useState<ConsultationRequest | null>(null);
    const [selectedNutritionist, setSelectedNutritionist] = useState<string>('');
    const [assignmentReason, setAssignmentReason] = useState('');
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [isAssigning, setIsAssigning] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchData = useCallback(async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: profile } = await supabase
                .from('profiles')
                .select('id')
                .eq('user_id', user.id)
                .single();

            if (!profile) return;

            // Get consultation requests that are completed but don't have assigned nutritionists
            const { data: requests } = await supabase
                .from('consultation_requests')
                .select(`
                    id,
                    client_id,
                    client_name,
                    client_email,
                    health_goals,
                    current_challenges,
                    status,
                    created_at,
                    scheduled_date,
                    completed_at
                `)
                .eq('status', 'completed')
                .is('assigned_nutritionist_id', null)
                .order('completed_at', { ascending: false });

            if (requests) {
                setConsultationRequests(requests);
            }

            // Get all available nutritionists with their stats
            const { data: nutritionistProfiles } = await supabase
                .from('nutritionists')
                .select(`
                    id,
                    profile_id,
                    specializations,
                    hourly_rate,
                    bio,
                    timezone,
                    profile:profile_id(
                        id,
                        full_name,
                        email
                    )
                `);

            if (nutritionistProfiles) {
                // Get active client counts for each nutritionist
                const nutritionistsWithStats = await Promise.all(
                    nutritionistProfiles.map(async (nutritionist) => {
                        // Handle case where profile data comes as array from Supabase join
                        const profileData = Array.isArray(nutritionist.profile)
                            ? nutritionist.profile[0]
                            : nutritionist.profile;

                        if (!profileData) {
                            console.warn('No profile data found for nutritionist:', nutritionist.id);
                            return null;
                        }

                        const { count } = await supabase
                            .from('nutritionist_assignments')
                            .select('*', { count: 'exact', head: true })
                            .eq('nutritionist_id', nutritionist.profile_id)
                            .eq('status', 'active');

                        return {
                            id: nutritionist.id,
                            profile_id: nutritionist.profile_id,
                            full_name: profileData.full_name,
                            email: profileData.email,
                            specializations: nutritionist.specializations || [],
                            hourly_rate: nutritionist.hourly_rate,
                            bio: nutritionist.bio,
                            timezone: nutritionist.timezone,
                            active_clients_count: count || 0
                        };
                    })
                );

                const validNutritionists = nutritionistsWithStats.filter(n => n !== null) as Nutritionist[];
                setNutritionists(validNutritionists);
            }
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    }, [supabase]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleAssignNutritionist = async () => {
        if (!selectedClient || !selectedNutritionist) return;

        setIsAssigning(true);

        try {
            const response = await fetch('/api/health-coach/assign-nutritionist', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    clientId: selectedClient.client_id,
                    nutritionistId: selectedNutritionist,
                    assignmentReason,
                    consultationId: selectedClient.id
                })
            });

            if (response.ok) {
                alert('Nutritionist assigned successfully!');
                setShowAssignModal(false);
                setSelectedClient(null);
                setSelectedNutritionist('');
                setAssignmentReason('');
                fetchData(); // Refresh the data
            } else {
                throw new Error('Failed to assign nutritionist');
            }
        } catch (error) {
            console.error('Error assigning nutritionist:', error);
            alert('Error assigning nutritionist. Please try again.');
        } finally {
            setIsAssigning(false);
        }
    };

    const filteredRequests = consultationRequests.filter(request =>
        request.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.client_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.health_goals.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getRecommendedNutritionist = (clientGoals: string, clientChallenges: string) => {
        const goals = clientGoals.toLowerCase();
        const challenges = clientChallenges.toLowerCase();

        return nutritionists.find(nutritionist => {
            const specs = nutritionist.specializations.map(s => s.toLowerCase()).join(' ');
            return specs.includes('weight') && (goals.includes('weight') || challenges.includes('weight')) ||
                specs.includes('diabetes') && (goals.includes('diabetes') || challenges.includes('diabetes')) ||
                specs.includes('pcos') && (goals.includes('pcos') || challenges.includes('pcos')) ||
                specs.includes('thyroid') && (goals.includes('thyroid') || challenges.includes('thyroid'));
        }) || nutritionists[0]; // Fallback to first nutritionist
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-800"></div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 py-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2">Assign Nutritionists</h1>
                <p className="text-gray-600">
                    Assign nutritionists to clients who have completed their consultations
                </p>
            </div>

            {/* Search and Stats */}
            <div className="mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search clients..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                </div>
                <div className="flex gap-4 text-sm">
                    <div className="bg-blue-50 px-3 py-2 rounded-lg">
                        <span className="font-medium text-blue-900">
                            {filteredRequests.length} clients awaiting assignment
                        </span>
                    </div>
                    <div className="bg-green-50 px-3 py-2 rounded-lg">
                        <span className="font-medium text-green-900">
                            {nutritionists.length} nutritionists available
                        </span>
                    </div>
                </div>
            </div>

            {filteredRequests.length === 0 ? (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
                    <CheckCircle size={48} className="mx-auto text-green-500 mb-4" />
                    <h2 className="text-xl font-semibold mb-2">All Caught Up!</h2>
                    <p className="text-gray-600">
                        No clients are currently waiting for nutritionist assignment.
                    </p>
                </div>
            ) : (
                <div className="grid gap-6">
                    {filteredRequests.map(request => {
                        const recommendedNutritionist = getRecommendedNutritionist(
                            request.health_goals,
                            request.current_challenges
                        );

                        return (
                            <div key={request.id} className="bg-white rounded-lg border shadow-sm p-6">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                                                <User size={24} className="text-gray-600" />
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-semibold">
                                                    {request.client_name}
                                                </h3>
                                                <p className="text-sm text-gray-600">
                                                    {request.client_email}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2 ml-auto">
                                                <Clock size={16} className="text-gray-400" />
                                                <span className="text-sm text-gray-500">
                                                    Completed {request.completed_at ?
                                                    format(parseISO(request.completed_at), 'MMM dd') :
                                                    'Recently'
                                                }
                                                </span>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                            <div className="bg-blue-50 rounded-lg p-3">
                                                <h4 className="font-medium text-blue-900 mb-1">Health Goals</h4>
                                                <p className="text-sm text-blue-800">{request.health_goals}</p>
                                            </div>
                                            <div className="bg-orange-50 rounded-lg p-3">
                                                <h4 className="font-medium text-orange-900 mb-1">Current Challenges</h4>
                                                <p className="text-sm text-orange-800">
                                                    {request.current_challenges || 'None specified'}
                                                </p>
                                            </div>
                                        </div>

                                        {recommendedNutritionist && (
                                            <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <Users size={16} className="text-green-600" />
                                                    <span className="font-medium text-green-900">
                                                        Recommended: {recommendedNutritionist.full_name}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-green-800">
                                                    Specializes in: {recommendedNutritionist.specializations.join(', ') || 'General nutrition'}
                                                </p>
                                                <p className="text-xs text-green-700 mt-1">
                                                    Active clients: {recommendedNutritionist.active_clients_count} •
                                                    Rate: ₹{recommendedNutritionist.hourly_rate}/hour
                                                </p>
                                            </div>
                                        )}

                                        <button
                                            onClick={() => {
                                                setSelectedClient(request);
                                                setSelectedNutritionist(recommendedNutritionist?.profile_id || '');
                                                setShowAssignModal(true);
                                            }}
                                            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
                                        >
                                            <Users size={16} />
                                            Assign Nutritionist
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Assignment Modal */}
            {showAssignModal && selectedClient && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <h2 className="text-2xl font-bold mb-6">
                            Assign Nutritionist to {selectedClient.client_name}
                        </h2>

                        <div className="space-y-6">
                            {/* Client Summary */}
                            <div className="bg-gray-50 rounded-lg p-4">
                                <h3 className="font-medium mb-2">Client Summary</h3>
                                <div className="text-sm text-gray-600 space-y-1">
                                    <p><strong>Goals:</strong> {selectedClient.health_goals}</p>
                                    <p><strong>Challenges:</strong> {selectedClient.current_challenges || 'None specified'}</p>
                                </div>
                            </div>

                            {/* Nutritionist Selection */}
                            <div>
                                <label className="block font-medium mb-3">Select Nutritionist</label>
                                <div className="space-y-3 max-h-60 overflow-y-auto">
                                    {nutritionists.map(nutritionist => (
                                        <label key={nutritionist.profile_id} className="flex items-start gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="nutritionist"
                                                value={nutritionist.profile_id}
                                                checked={selectedNutritionist === nutritionist.profile_id}
                                                onChange={(e) => setSelectedNutritionist(e.target.value)}
                                                className="mt-1"
                                            />
                                            <div className="flex-1">
                                                <div className="flex items-center justify-between mb-1">
                                                    <h4 className="font-medium">{nutritionist.full_name}</h4>
                                                    <span className="text-sm text-gray-500">
                                                        ₹{nutritionist.hourly_rate}/hour
                                                    </span>
                                                </div>
                                                <p className="text-sm text-gray-600 mb-1">
                                                    {nutritionist.specializations.length > 0
                                                        ? nutritionist.specializations.join(', ')
                                                        : 'General nutrition'
                                                    }
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                    {nutritionist.active_clients_count} active clients • {nutritionist.timezone}
                                                </p>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Assignment Reason */}
                            <div>
                                <label className="block font-medium mb-2">Assignment Reason</label>
                                <textarea
                                    value={assignmentReason}
                                    onChange={(e) => setAssignmentReason(e.target.value)}
                                    rows={3}
                                    placeholder="Why is this nutritionist a good fit for this client?"
                                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>

                        <div className="flex gap-4 mt-8">
                            <button
                                onClick={handleAssignNutritionist}
                                disabled={!selectedNutritionist || isAssigning}
                                className="flex-1 bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
                            >
                                {isAssigning ? 'Assigning...' : 'Assign Nutritionist'}
                            </button>
                            <button
                                onClick={() => {
                                    setShowAssignModal(false);
                                    setSelectedClient(null);
                                    setSelectedNutritionist('');
                                    setAssignmentReason('');
                                }}
                                className="flex-1 bg-gray-200 text-gray-800 font-bold py-3 rounded-lg hover:bg-gray-300 transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}