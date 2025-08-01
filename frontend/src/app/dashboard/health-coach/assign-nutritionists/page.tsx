// app/dashboard/health-coach/assign-nutritionists/page.tsx
// Fixed to work with actual database schema (no nutritionists table)
'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { User, Users, Calendar, Clock, CheckCircle, AlertCircle, Search } from 'lucide-react';
import { format, parseISO } from 'date-fns';

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

type Professional = {
    id: string;
    profile_id: string;
    full_name: string;
    email: string;
    role: 'nutritionist' | 'trainer' | 'health_coach';
    specializations: string[];
    hourly_rate: number;
    bio?: string;
    timezone: string;
    active_clients_count: number;
};

export default function AssignProfessionalsPage() {
    const supabase = createClientComponentClient();
    const [loading, setLoading] = useState(true);
    const [consultationRequests, setConsultationRequests] = useState<ConsultationRequest[]>([]);
    const [professionals, setProfessionals] = useState<Professional[]>([]);
    const [selectedClient, setSelectedClient] = useState<ConsultationRequest | null>(null);
    const [selectedProfessional, setSelectedProfessional] = useState<string>('');
    const [assignmentReason, setAssignmentReason] = useState('');
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [isAssigning, setIsAssigning] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: profile } = await supabase
                .from('profiles')
                .select('id')
                .eq('user_id', user.id)
                .single();

            if (!profile) return;

            // Get consultation requests that are completed but don't have assigned nutritionists
            const { data: requests, error: requestsError } = await supabase
                .from('consultation_requests')
                .select('*')
                .eq('status', 'completed')
                .is('assigned_nutritionist_id', null)
                .order('completed_at', { ascending: false });

            console.log('Consultation requests:', requests);
            console.log('Requests error:', requestsError);

            if (requests) {
                // Transform to match expected interface
                const transformedRequests: ConsultationRequest[] = requests.map(request => ({
                    id: request.id,
                    client_id: request.client_id || request.id, // Use id if client_id is missing
                    client_name: request.full_name || 'Unknown Client',
                    client_email: request.email || '',
                    health_goals: request.health_goals || '',
                    current_challenges: request.current_challenges || '',
                    status: request.status,
                    created_at: request.created_at,
                    scheduled_date: request.scheduled_date,
                    completed_at: request.completed_at
                }));
                setConsultationRequests(transformedRequests);
            }

            // FIXED: Get all professionals from profiles table (nutritionist, trainer, health_coach)
            console.log('Fetching professionals from profiles table...');

            const { data: professionalProfiles, error: profilesError } = await supabase
                .from('profiles')
                .select('id, full_name, email, bio, specialties, hourly_rate, timezone, role')
                .in('role', ['nutritionist', 'trainer', 'health_coach']);

            console.log('Professional profiles:', professionalProfiles);
            console.log('Profiles error:', profilesError);

            if (professionalProfiles && professionalProfiles.length > 0) {
                // Transform profiles to professional format
                const professionalsWithCounts = await Promise.all(
                    professionalProfiles.map(async (profile) => {
                        // Get active client count from nutritionist_assignments (this table might be used for all assignments)
                        const { count } = await supabase
                            .from('nutritionist_assignments')
                            .select('*', { count: 'exact', head: true })
                            .eq('nutritionist_id', profile.id)
                            .eq('status', 'active');

                        return {
                            id: profile.id, // Use profile id as professional id
                            profile_id: profile.id,
                            full_name: profile.full_name || `Unknown ${profile.role}`,
                            email: profile.email || '',
                            role: profile.role as 'nutritionist' | 'trainer' | 'health_coach',
                            specializations: Array.isArray(profile.specialties) ? profile.specialties : [],
                            hourly_rate: profile.hourly_rate || 0,
                            bio: profile.bio,
                            timezone: profile.timezone || 'UTC',
                            active_clients_count: count || 0
                        };
                    })
                );

                console.log('Processed professionals:', professionalsWithCounts);
                setProfessionals(professionalsWithCounts);
            } else {
                console.log('No professional profiles found');
                setProfessionals([]);
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
        // FIXED: Changed selectedNutritionist to selectedProfessional
        if (!selectedClient || !selectedProfessional) return;

        setIsAssigning(true);

        try {
            const response = await fetch('/api/health-coach/assign-nutritionist', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    clientId: selectedClient.client_id,
                    nutritionistId: selectedProfessional, // This API endpoint can handle any professional
                    assignmentReason,
                    consultationId: selectedClient.id
                })
            });

            const result = await response.json();

            if (response.ok) {
                alert('Professional assigned successfully!');
                setShowAssignModal(false);
                setSelectedClient(null);
                setSelectedProfessional('');
                setAssignmentReason('');
                fetchData(); // Refresh the data
            } else {
                throw new Error(result.error || 'Failed to assign nutritionist');
            }
        } catch (error) {
            console.error('Error assigning professional:', error);
            alert(`Error assigning professional: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setIsAssigning(false);
        }
    };

    const filteredRequests = consultationRequests.filter(request =>
        request.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.client_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.health_goals.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getRecommendedProfessional = (clientGoals: string, clientChallenges: string) => {
        if (professionals.length === 0) return null;

        const goals = clientGoals.toLowerCase();
        const challenges = clientChallenges.toLowerCase();

        // First try to find a nutritionist for nutrition-related goals
        const nutritionist = professionals.find(professional => {
            if (professional.role !== 'nutritionist') return false;
            const specs = professional.specializations.map(s => s.toLowerCase()).join(' ');
            return (
                (specs.includes('weight') && (goals.includes('weight') || challenges.includes('weight'))) ||
                (specs.includes('diabetes') && (goals.includes('diabetes') || challenges.includes('diabetes'))) ||
                (specs.includes('pcos') && (goals.includes('pcos') || challenges.includes('pcos'))) ||
                (specs.includes('thyroid') && (goals.includes('thyroid') || challenges.includes('thyroid')))
            );
        });

        // Then try trainers for fitness-related goals
        const trainer = professionals.find(professional => {
            if (professional.role !== 'trainer') return false;
            const specs = professional.specializations.map(s => s.toLowerCase()).join(' ');
            return (
                goals.includes('muscle') || goals.includes('fitness') || goals.includes('exercise') ||
                goals.includes('strength') || goals.includes('athletic') || goals.includes('sport') ||
                challenges.includes('weak') || challenges.includes('stamina')
            );
        });

        // Return the best match or fallback to first nutritionist, then any professional
        return nutritionist || trainer || professionals.find(p => p.role === 'nutritionist') || professionals[0];
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
                <h1 className="text-3xl font-bold mb-2">Assign Professionals</h1>
                <p className="text-gray-600">
                    Assign nutritionists, trainers, or health coaches to clients who have completed their consultations
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
                            {professionals.length} professionals available
                        </span>
                    </div>
                </div>
            </div>

            {/* Debug Information */}
            <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                    Debug: Found {professionals.length} professionals and {consultationRequests.length} completed consultations
                </p>
                <div className="mt-2 text-sm">
                    {professionals.length > 0 && (
                        <div className="text-blue-600">
                            <p>Professionals by role:</p>
                            <ul className="list-disc list-inside ml-4">
                                <li>Nutritionists: {professionals.filter(p => p.role === 'nutritionist').length}</li>
                                <li>Trainers: {professionals.filter(p => p.role === 'trainer').length}</li>
                                <li>Health Coaches: {professionals.filter(p => p.role === 'health_coach').length}</li>
                            </ul>
                        </div>
                    )}
                    {professionals.length === 0 && (
                        <div className="text-red-600">
                            <p>No professionals found. This could be because:</p>
                            <ul className="list-disc list-inside mt-1">
                                <li>No users have role = 'nutritionist', 'trainer', or 'health_coach' in the profiles table</li>
                                <li>Professionals haven't completed their profile setup</li>
                            </ul>
                        </div>
                    )}
                    {consultationRequests.length === 0 && (
                        <p className="text-blue-600 mt-2">
                            No completed consultations waiting for assignment. Check consultation_requests table.
                        </p>
                    )}
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
                        const recommendedProfessional = getRecommendedProfessional(
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

                                        {recommendedProfessional && (
                                            <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <Users size={16} className="text-green-600" />
                                                    <span className="font-medium text-green-900">
                                                        Recommended: {recommendedProfessional.full_name}
                                                    </span>
                                                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full capitalize">
                                                        {recommendedProfessional.role.replace('_', ' ')}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-green-800">
                                                    Specializes in: {recommendedProfessional.specializations.join(', ') || 'General consultation'}
                                                </p>
                                                <p className="text-xs text-green-700 mt-1">
                                                    Active clients: {recommendedProfessional.active_clients_count} •
                                                    Rate: ₹{recommendedProfessional.hourly_rate}/hour
                                                </p>
                                            </div>
                                        )}

                                        <button
                                            onClick={() => {
                                                setSelectedClient(request);
                                                setSelectedProfessional(recommendedProfessional?.profile_id || '');
                                                setShowAssignModal(true);
                                            }}
                                            disabled={professionals.length === 0}
                                            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
                                        >
                                            <Users size={16} />
                                            {professionals.length === 0 ? 'No Professionals Available' : 'Assign Professional'}
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
                            Assign Professional to {selectedClient.client_name}
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

                            {/* Professional Selection */}
                            <div>
                                <label className="block font-medium mb-3">Select Professional</label>
                                {professionals.length === 0 ? (
                                    <div className="text-center py-8 text-gray-500">
                                        <AlertCircle size={48} className="mx-auto mb-4" />
                                        <p>No professionals available at the moment.</p>
                                        <p className="text-sm mt-2">Please ensure users with role 'nutritionist', 'trainer', or 'health_coach' exist in the profiles table.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3 max-h-60 overflow-y-auto">
                                        {professionals.map(professional => (
                                            <label key={professional.profile_id} className="flex items-start gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name="professional"
                                                    value={professional.profile_id}
                                                    checked={selectedProfessional === professional.profile_id}
                                                    onChange={(e) => setSelectedProfessional(e.target.value)}
                                                    className="mt-1"
                                                />
                                                <div className="flex-1">
                                                    <div className="flex items-center justify-between mb-1">
                                                        <div className="flex items-center gap-2">
                                                            <h4 className="font-medium">{professional.full_name}</h4>
                                                            <span className={`text-xs px-2 py-1 rounded-full font-medium capitalize ${
                                                                professional.role === 'nutritionist' ? 'bg-green-100 text-green-700' :
                                                                    professional.role === 'trainer' ? 'bg-blue-100 text-blue-700' :
                                                                        'bg-purple-100 text-purple-700'
                                                            }`}>
                                                                {professional.role.replace('_', ' ')}
                                                            </span>
                                                        </div>
                                                        <span className="text-sm text-gray-500">
                                                            ₹{professional.hourly_rate}/hour
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-gray-600 mb-1">
                                                        {professional.specializations.length > 0
                                                            ? professional.specializations.join(', ')
                                                            : 'General consultation'
                                                        }
                                                    </p>
                                                    <p className="text-xs text-gray-500">
                                                        {professional.active_clients_count} active clients • {professional.timezone}
                                                    </p>
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Assignment Reason */}
                            <div>
                                <label className="block font-medium mb-2">Assignment Reason</label>
                                <textarea
                                    value={assignmentReason}
                                    onChange={(e) => setAssignmentReason(e.target.value)}
                                    rows={3}
                                    placeholder="Why is this professional a good fit for this client?"
                                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>

                        <div className="flex gap-4 mt-8">
                            <button
                                onClick={handleAssignNutritionist}
                                disabled={!selectedProfessional || isAssigning || professionals.length === 0}
                                className="flex-1 bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
                            >
                                {isAssigning ? 'Assigning...' : 'Assign Professional'}
                            </button>
                            <button
                                onClick={() => {
                                    setShowAssignModal(false);
                                    setSelectedClient(null);
                                    setSelectedProfessional('');
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