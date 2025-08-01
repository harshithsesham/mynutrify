// app/dashboard/health-coach/assign-nutritionists/page.tsx
// Fixed to work with actual database schema and include scheduled consultations
'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { User, Users, Clock, CheckCircle, AlertCircle, Search, Calendar } from 'lucide-react';
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
    scheduled_time?: string;
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
            if (!user) {
                console.log('No authenticated user found');
                return;
            }

            console.log('=== FETCHING DATA FROM YOUR SCHEMA ===');

            try {
                // STEP 1: Get consultation requests from consultation_requests table
                console.log('Fetching from consultation_requests table...');

                // First check what statuses are available
                const { data: statusCheck } = await supabase
                    .from('consultation_requests')
                    .select('status')
                    .limit(10);

                const availableStatuses = statusCheck ? [...new Set(statusCheck.map(c => c.status))] : [];
                console.log('Available statuses:', availableStatuses);

                // Get consultation requests - includes both completed AND scheduled consultations
                const { data: assignableConsultations } = await supabase
                    .from('consultation_requests')
                    .select('*')
                    .in('status', ['completed', 'scheduled', 'confirmed'])
                    .is('assigned_nutritionist_id', null)
                    .order('created_at', { ascending: false });

                if (assignableConsultations && assignableConsultations.length > 0) {
                    console.log('Found assignable consultations:', assignableConsultations.length);

                    // Log breakdown by status
                    const statusBreakdown = assignableConsultations.reduce((acc, consultation) => {
                        const status = consultation.status || 'unknown';
                        acc[status] = (acc[status] || 0) + 1;
                        return acc;
                    }, {} as Record<string, number>);
                    console.log('Consultation status breakdown:', statusBreakdown);

                    const transformedRequests: ConsultationRequest[] = assignableConsultations.map(request => {
                        // Safely parse dates with fallbacks
                        let createdAt = request.created_at;
                        let scheduledDate = request.scheduled_date;
                        let completedAt = request.completed_at;

                        // Validate created_at
                        try {
                            if (createdAt) {
                                const date = new Date(createdAt);
                                if (isNaN(date.getTime())) {
                                    console.warn('Invalid created_at date:', createdAt);
                                    createdAt = new Date().toISOString();
                                }
                            } else {
                                createdAt = new Date().toISOString();
                            }
                        } catch (e) {
                            console.error('Error parsing created_at:', e);
                            createdAt = new Date().toISOString();
                        }

                        // Validate scheduled_date
                        if (scheduledDate) {
                            try {
                                // For date-only strings (YYYY-MM-DD), parse carefully
                                // Don't use new Date() directly as it can cause timezone issues
                                if (scheduledDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
                                    // Valid date format, keep as is
                                } else {
                                    console.warn('Invalid scheduled_date format:', scheduledDate);
                                    scheduledDate = undefined;
                                }
                            } catch (e) {
                                console.error('Error validating scheduled_date:', e);
                                scheduledDate = undefined;
                            }
                        }

                        // Validate completed_at
                        if (completedAt) {
                            try {
                                const date = new Date(completedAt);
                                if (isNaN(date.getTime())) {
                                    console.warn('Invalid completed_at:', completedAt);
                                    completedAt = undefined;
                                }
                            } catch (e) {
                                console.error('Error parsing completed_at:', e);
                                completedAt = undefined;
                            }
                        }

                        return {
                            id: request.id,
                            // Use the consultation request ID as client_id if no actual client_id exists
                            client_id: request.client_id || request.id,
                            client_name: request.full_name || `Client ${request.id.slice(-4)}`,
                            client_email: request.email || 'No email provided',
                            health_goals: request.health_goals || 'Not specified',
                            current_challenges: request.current_challenges || 'Not specified',
                            status: request.status || 'pending',
                            created_at: createdAt,
                            scheduled_date: scheduledDate,
                            scheduled_time: request.scheduled_time,
                            completed_at: completedAt
                        };
                    });

                    console.log('Transformed consultation requests:', transformedRequests);
                    setConsultationRequests(transformedRequests);
                } else {
                    console.log('No consultation requests found');
                    setConsultationRequests([]);
                }
            } catch (consultationError) {
                console.error('Error fetching consultation requests:', consultationError);
                setConsultationRequests([]);
            }

            try {
                // STEP 2: Get professionals from profiles table
                console.log('Fetching professionals from profiles table...');

                const { data: professionalProfiles, error: profilesError } = await supabase
                    .from('profiles')
                    .select('id, full_name, email, bio, specializations, hourly_rate, timezone, role')
                    .in('role', ['nutritionist', 'trainer', 'health_coach'])
                    .not('full_name', 'is', null);

                console.log('Professional profiles:', professionalProfiles);
                console.log('Profiles error:', profilesError);

                if (professionalProfiles && professionalProfiles.length > 0) {
                    // Get client counts from nutritionist_assignments table
                    const professionalsWithCounts = await Promise.all(
                        professionalProfiles.map(async (profile) => {
                            // Get active client count
                            let clientCount = 0;
                            try {
                                const { count } = await supabase
                                    .from('nutritionist_assignments')
                                    .select('*', { count: 'exact', head: true })
                                    .eq('nutritionist_id', profile.id)
                                    .eq('status', 'active');
                                clientCount = count || 0;
                            } catch (error) {
                                console.log('Could not fetch client count for', profile.full_name);
                                clientCount = 0;
                            }

                            return {
                                id: profile.id,
                                profile_id: profile.id,
                                full_name: profile.full_name || `Unknown ${profile.role}`,
                                email: profile.email || 'No email provided',
                                role: profile.role as 'nutritionist' | 'trainer' | 'health_coach',
                                specializations: Array.isArray(profile.specializations) ? profile.specializations :
                                    typeof profile.specializations === 'string' && profile.specializations ?
                                        profile.specializations.split(',').map(s => s.trim()) : [],
                                hourly_rate: profile.hourly_rate || 0,
                                bio: profile.bio || '',
                                timezone: profile.timezone || 'UTC',
                                active_clients_count: clientCount
                            };
                        })
                    );

                    console.log('Processed professionals with client counts:', professionalsWithCounts);
                    setProfessionals(professionalsWithCounts);
                } else {
                    console.log('No professional profiles found');
                    setProfessionals([]);
                }
            } catch (professionalsError) {
                console.error('Error fetching professionals:', professionalsError);
                setProfessionals([]);
            }

        } catch (error) {
            console.error('Error fetching data:', error);
            // Show user-friendly error message
            if (error instanceof Error) {
                console.error('Error details:', error.message);
            }
        } finally {
            setLoading(false);
        }
    }, [supabase]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleAssignProfessional = async () => {
        if (!selectedClient || !selectedProfessional) {
            alert('Please select both a client and a professional');
            return;
        }

        setIsAssigning(true);

        try {
            console.log('Assigning professional using your schema...');
            console.log('Client:', selectedClient);
            console.log('Professional ID:', selectedProfessional);

            // Try the API endpoint first
            try {
                const response = await fetch('/api/health-coach/assign-nutritionist', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        clientId: selectedClient.client_id,
                        nutritionistId: selectedProfessional,
                        assignmentReason,
                        consultationId: selectedClient.id
                    })
                });

                const result = await response.json();

                if (response.ok) {
                    console.log('API assignment successful:', result);
                    alert('Professional assigned successfully!');
                    setShowAssignModal(false);
                    setSelectedClient(null);
                    setSelectedProfessional('');
                    setAssignmentReason('');
                    fetchData();
                    return;
                } else {
                    // Check if it's because the client doesn't have an account
                    if (result.error && result.error.includes('Client does not have an account')) {
                        alert('This client needs to create an account first before they can be assigned a nutritionist. They will receive instructions via email after their consultation.');
                    } else {
                        throw new Error(result.error || 'Failed to assign nutritionist');
                    }
                }
            } catch (apiError) {
                console.log('API failed, trying direct database update...');
            }

            // Fallback: Direct database update
            console.log('Updating consultation_requests table directly...');

            const { data: updateResult, error: updateError } = await supabase
                .from('consultation_requests')
                .update({
                    assigned_nutritionist_id: selectedProfessional,
                    updated_at: new Date().toISOString()
                })
                .eq('id', selectedClient.id)
                .select();

            if (updateError) {
                throw new Error(`Failed to update consultation: ${updateError.message}`);
            }

            console.log('Consultation updated successfully:', updateResult);

            // Create assignment record in nutritionist_assignments table
            try {
                const { data: assignmentResult, error: assignmentError } = await supabase
                    .from('nutritionist_assignments')
                    .insert({
                        nutritionist_id: selectedProfessional,
                        client_id: selectedClient.client_id,
                        assignment_reason: assignmentReason || 'Assigned by health coach',
                        status: 'active',
                        created_at: new Date().toISOString()
                    })
                    .select();

                if (assignmentError) {
                    console.log('Assignment record creation failed:', assignmentError);
                } else {
                    console.log('Assignment record created:', assignmentResult);
                }
            } catch (assignmentError) {
                console.log('Could not create assignment record:', assignmentError);
            }

            alert('Professional assigned successfully!');
            setShowAssignModal(false);
            setSelectedClient(null);
            setSelectedProfessional('');
            setAssignmentReason('');
            fetchData();

        } catch (error) {
            console.error('Error assigning professional:', error);
            alert(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
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

        // Find nutritionist for nutrition-related goals
        const nutritionist = professionals.find(professional => {
            if (professional.role !== 'nutritionist') return false;
            const specs = professional.specializations.map(s => s.toLowerCase()).join(' ');
            return (
                specs.includes('weight') || specs.includes('diet') || specs.includes('nutrition') ||
                specs.includes('diabetes') || specs.includes('pcos') || specs.includes('thyroid') ||
                goals.includes('weight') || goals.includes('diet') || goals.includes('nutrition') ||
                challenges.includes('diabetes') || challenges.includes('pcos') || challenges.includes('thyroid')
            );
        });

        // Find trainer for fitness-related goals
        const trainer = professionals.find(professional => {
            if (professional.role !== 'trainer') return false;
            return (
                goals.includes('muscle') || goals.includes('fitness') || goals.includes('exercise') ||
                goals.includes('strength') || goals.includes('workout') || goals.includes('training') ||
                challenges.includes('weak') || challenges.includes('strength') || challenges.includes('stamina')
            );
        });

        // Find health coach for general wellness
        const healthCoach = professionals.find(professional => {
            if (professional.role !== 'health_coach') return false;
            return true;
        });

        return nutritionist || trainer || healthCoach || professionals[0];
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
                    Assign nutritionists, trainers, or health coaches to clients who have completed or scheduled consultations
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
                            {filteredRequests.length} clients available
                        </span>
                    </div>
                    <div className="bg-green-50 px-3 py-2 rounded-lg">
                        <span className="font-medium text-green-900">
                            {professionals.length} professionals available
                        </span>
                    </div>
                </div>
            </div>

            {/* Status Information */}
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800 font-medium">
                    📊 Database Status: {professionals.length} professionals • {consultationRequests.length} consultations ready for assignment
                </p>
                <div className="mt-2 text-sm space-y-2">
                    {consultationRequests.length > 0 && (
                        <div className="text-green-600">
                            <p className="font-medium">✅ Consultations available for assignment:</p>
                            <p className="text-xs ml-4">
                                Status breakdown: {[...new Set(consultationRequests.map(r => r.status))].map(status =>
                                `${status} (${consultationRequests.filter(r => r.status === status).length})`
                            ).join(', ')}
                            </p>
                        </div>
                    )}
                    {consultationRequests.length === 0 && (
                        <p className="text-orange-600">
                            ⚠️ No consultations available for assignment. Looking for consultations with status: completed or scheduled
                        </p>
                    )}
                </div>
            </div>

            {filteredRequests.length === 0 ? (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
                    <CheckCircle size={48} className="mx-auto text-green-500 mb-4" />
                    <h2 className="text-xl font-semibold mb-2">No Clients Available for Assignment</h2>
                    <p className="text-gray-600">
                        {consultationRequests.length === 0
                            ? "No consultation requests found in your database."
                            : "All consultations have been filtered out by your search."}
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
                            <div key={request.id} className="bg-white rounded-lg border shadow-sm p-6 hover:shadow-md transition-shadow">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center">
                                                <User size={24} className="text-white" />
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-semibold text-gray-800">
                                                    {request.client_name}
                                                </h3>
                                                <p className="text-sm text-gray-600">
                                                    {request.client_email}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2 ml-auto">
                                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                                    request.status === 'completed' ? 'bg-green-100 text-green-800' :
                                                        request.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                                                            request.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                                                'bg-gray-100 text-gray-800'
                                                }`}>
                                                    {request.status}
                                                </span>
                                                <Clock size={16} className="text-gray-400" />
                                                <span className="text-sm text-gray-500">
                                                    {(() => {
                                                        try {
                                                            if (request.scheduled_date) {
                                                                // Parse date carefully to avoid timezone issues
                                                                const [year, month, day] = request.scheduled_date.split('-').map(Number);
                                                                const date = new Date(year, month - 1, day);
                                                                return format(date, 'MMM dd');
                                                            } else if (request.created_at) {
                                                                return format(parseISO(request.created_at), 'MMM dd');
                                                            }
                                                            return 'Date unknown';
                                                        } catch (e) {
                                                            console.error('Error formatting date:', e);
                                                            return 'Invalid date';
                                                        }
                                                    })()}
                                                </span>
                                            </div>
                                        </div>

                                        {request.scheduled_date && request.status === 'scheduled' && (
                                            <div className="bg-blue-50 rounded-xl p-4 border border-blue-100 mb-4">
                                                <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                                                    <Calendar size={16} />
                                                    Scheduled Consultation
                                                </h4>
                                                <p className="text-sm text-blue-800">
                                                    {(() => {
                                                        try {
                                                            // Parse date carefully to avoid timezone issues
                                                            const [year, month, day] = request.scheduled_date.split('-').map(Number);
                                                            const date = new Date(year, month - 1, day);
                                                            const formattedDate = format(date, 'EEEE, MMMM do, yyyy');
                                                            return `${formattedDate}${request.scheduled_time ? ` at ${request.scheduled_time}` : ''}`;
                                                        } catch (e) {
                                                            console.error('Error formatting scheduled date:', e);
                                                            return 'Invalid date';
                                                        }
                                                    })()}
                                                </p>
                                            </div>
                                        )}

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                            <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                                                <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                                                    🎯 Health Goals
                                                </h4>
                                                <p className="text-sm text-blue-800">{request.health_goals}</p>
                                            </div>
                                            <div className="bg-orange-50 rounded-xl p-4 border border-orange-100">
                                                <h4 className="font-semibold text-orange-900 mb-2 flex items-center gap-2">
                                                    ⚠️ Current Challenges
                                                </h4>
                                                <p className="text-sm text-orange-800">
                                                    {request.current_challenges}
                                                </p>
                                            </div>
                                        </div>

                                        {recommendedProfessional && (
                                            <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Users size={18} className="text-green-600" />
                                                    <span className="font-semibold text-green-900">
                                                        Recommended: {recommendedProfessional.full_name}
                                                    </span>
                                                    <span className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full font-medium capitalize">
                                                        {recommendedProfessional.role.replace('_', ' ')}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-green-800 mb-1">
                                                    📧 {recommendedProfessional.email}
                                                </p>
                                                <p className="text-sm text-green-800">
                                                    {recommendedProfessional.specializations.length > 0
                                                        ? `🏆 Specializes in: ${recommendedProfessional.specializations.join(', ')}`
                                                        : '🏆 General consultation specialist'
                                                    }
                                                </p>
                                                <div className="flex items-center gap-4 mt-2 text-xs text-green-700">
                                                    <span>👥 {recommendedProfessional.active_clients_count} active clients</span>
                                                    <span>💰 ₹{recommendedProfessional.hourly_rate}/hour</span>
                                                    <span>🌍 {recommendedProfessional.timezone}</span>
                                                </div>
                                            </div>
                                        )}

                                        <button
                                            onClick={() => {
                                                setSelectedClient(request);
                                                setSelectedProfessional(recommendedProfessional?.profile_id || '');
                                                setShowAssignModal(true);
                                            }}
                                            disabled={professionals.length === 0}
                                            className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-blue-800 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed flex items-center gap-2 font-medium transition-all duration-200 shadow-md hover:shadow-lg"
                                        >
                                            <Users size={18} />
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
                    <div className="bg-white rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
                        <h2 className="text-2xl font-bold mb-6 text-gray-800">
                            Assign Professional to {selectedClient.client_name}
                        </h2>

                        <div className="space-y-6">
                            {/* Client Summary */}
                            <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                                <h3 className="font-semibold mb-3 text-gray-800">Client Summary</h3>
                                <div className="text-sm text-gray-600 space-y-2">
                                    <p><strong>🎯 Goals:</strong> {selectedClient.health_goals}</p>
                                    <p><strong>⚠️ Challenges:</strong> {selectedClient.current_challenges}</p>
                                    <p><strong>📧 Email:</strong> {selectedClient.client_email}</p>
                                    {selectedClient.client_id === selectedClient.id && (
                                        <p className="text-orange-600 text-xs mt-2">
                                            ⚠️ Note: This client hasn&apos;t created an account yet. They need to sign up before assignment.
                                        </p>
                                    )}
                                    {selectedClient.scheduled_date && selectedClient.status === 'scheduled' && (
                                        <p><strong>📅 Scheduled:</strong> {(() => {
                                            try {
                                                const [year, month, day] = selectedClient.scheduled_date.split('-').map(Number);
                                                const date = new Date(year, month - 1, day);
                                                return format(date, 'MMM dd, yyyy');
                                            } catch {
                                                return 'Invalid date';
                                            }
                                        })()} {selectedClient.scheduled_time}</p>
                                    )}
                                </div>
                            </div>

                            {/* Professional Selection */}
                            <div>
                                <label className="block font-semibold mb-4 text-gray-800">Select Professional</label>
                                {professionals.length === 0 ? (
                                    <div className="text-center py-8 text-gray-500">
                                        <AlertCircle size={48} className="mx-auto mb-4 text-gray-400" />
                                        <p className="font-medium">No professionals available.</p>
                                        <p className="text-sm mt-2">Add users with role &apos;nutritionist&apos;, &apos;trainer&apos;, or &apos;health_coach&apos; in profiles table.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3 max-h-60 overflow-y-auto">
                                        {professionals.map(professional => (
                                            <label key={professional.profile_id} className="flex items-start gap-4 p-4 border-2 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors duration-200 hover:border-blue-200">
                                                <input
                                                    type="radio"
                                                    name="professional"
                                                    value={professional.profile_id}
                                                    checked={selectedProfessional === professional.profile_id}
                                                    onChange={(e) => setSelectedProfessional(e.target.value)}
                                                    className="mt-2 w-4 h-4 text-blue-600"
                                                />
                                                <div className="flex-1">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <div className="flex items-center gap-3">
                                                            <h4 className="font-semibold text-gray-800">{professional.full_name}</h4>
                                                            <span className={`text-xs px-3 py-1 rounded-full font-medium capitalize ${
                                                                professional.role === 'nutritionist' ? 'bg-green-100 text-green-700' :
                                                                    professional.role === 'trainer' ? 'bg-blue-100 text-blue-700' :
                                                                        'bg-purple-100 text-purple-700'
                                                            }`}>
                                                                {professional.role.replace('_', ' ')}
                                                            </span>
                                                        </div>
                                                        {professional.hourly_rate > 0 && (
                                                            <span className="text-sm font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded">
                                                                ₹{professional.hourly_rate}/hour
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-sm text-gray-600 mb-2">
                                                        📧 {professional.email}
                                                    </p>
                                                    <p className="text-sm text-gray-600 mb-2">
                                                        🏆 {professional.specializations.length > 0
                                                        ? professional.specializations.join(', ')
                                                        : 'General consultation'
                                                    }
                                                    </p>
                                                    <div className="flex items-center gap-4 text-xs text-gray-500">
                                                        <span>👥 {professional.active_clients_count} active clients</span>
                                                        <span>🌍 {professional.timezone}</span>
                                                    </div>
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Assignment Reason */}
                            <div>
                                <label className="block font-semibold mb-3 text-gray-800">Assignment Reason (Optional)</label>
                                <textarea
                                    value={assignmentReason}
                                    onChange={(e) => setAssignmentReason(e.target.value)}
                                    rows={3}
                                    placeholder="Why is this professional a good fit for this client?"
                                    className="w-full p-4 border-2 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                                />
                            </div>
                        </div>

                        <div className="flex gap-4 mt-8">
                            <button
                                onClick={handleAssignProfessional}
                                disabled={!selectedProfessional || isAssigning || professionals.length === 0}
                                className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold py-4 rounded-xl hover:from-blue-700 hover:to-blue-800 disabled:from-gray-400 disabled:to-gray-500 transition-all duration-200 shadow-lg hover:shadow-xl"
                            >
                                {isAssigning ? '🔄 Assigning...' : '✅ Assign Professional'}
                            </button>
                            <button
                                onClick={() => {
                                    setShowAssignModal(false);
                                    setSelectedClient(null);
                                    setSelectedProfessional('');
                                    setAssignmentReason('');
                                }}
                                className="flex-1 bg-gray-200 text-gray-800 font-bold py-4 rounded-xl hover:bg-gray-300 transition-colors duration-200"
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