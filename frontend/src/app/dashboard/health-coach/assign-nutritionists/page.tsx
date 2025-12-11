// app/dashboard/health-coach/assign-nutritionists/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import {
    User,
    Users,
    Clock,
    CheckCircle,
    AlertCircle,
    Search,
    UserPlus,
    UserMinus,
    MoreVertical,
    X,
    Filter,
    MessageSquare,
    FileText,
    TrendingUp,
    AlertTriangle,
    Loader2
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import Link from 'next/link';

// Types (Retained)
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

type AssignedClient = {
    id: string;
    client_id: string;
    assignment_reason: string;
    assigned_at: string;
    status: 'active' | 'inactive';
    client: {
        id: string;
        full_name: string;
        email: string;
        user_id: string;
    };
    nutritionist: {
        id: string;
        full_name: string;
        email: string;
        specializations: string[];
    };
    sessions_count?: number;
    last_session_date?: string;
    next_appointment?: {
        start_time: string;
    };
};

// Unassign Modal Component (Redesigned with Teal accents)
const UnassignModal = ({
                           client,
                           onClose,
                           onConfirm,
                           isLoading
                       }: {
    client: AssignedClient;
    onClose: () => void;
    onConfirm: (reason: string) => void;
    isLoading: boolean;
}) => {
    const [reason, setReason] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onConfirm(reason);
    };

    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl">
                <div className="flex items-center justify-between mb-6 border-b pb-4">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center flex-shrink-0">
                            <AlertTriangle size={24} className="text-red-600" />
                        </div>
                        <div>
                            <h3 className="text-2xl font-bold text-gray-900">Unassign Client?</h3>
                            <p className="text-gray-600 text-sm">Remove the current professional assignment</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-800 rounded-full hover:bg-gray-100 transition-colors"
                        disabled={isLoading}
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="bg-gray-50 rounded-xl p-4 mb-6 border border-gray-200">
                    <p className="font-medium text-gray-900">{client.client.full_name}</p>
                    <p className="text-sm text-gray-600 mb-2">{client.client.email}</p>
                    <p className="text-sm">
                        <span className="font-semibold text-teal-600">Assigned to:</span> {client.nutritionist.full_name}
                    </p>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Reason for unassigning (Optional but recommended)
                        </label>
                        <textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            rows={3}
                            placeholder="e.g., Client requested change, plan completed, etc."
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none transition-shadow"
                        />
                    </div>

                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isLoading}
                            className="flex-1 py-3 px-6 bg-gray-200 text-gray-700 font-bold rounded-full hover:bg-gray-300 transition-colors disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="flex-1 py-3 px-6 bg-red-600 text-white font-bold rounded-full hover:bg-red-700 transition-colors disabled:bg-red-400 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 size={16} className="animate-spin" />
                                    Unassigning...
                                </>
                            ) : (
                                <>
                                    <UserMinus size={16} />
                                    Unassign Client
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};


export default function AssignNutritionistsPage() {
    const supabase = createClientComponentClient();

    // State for both sections
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'assign' | 'assigned'>('assign');

    // Assign section state
    const [consultationRequests, setConsultationRequests] = useState<ConsultationRequest[]>([]);
    const [professionals, setProfessionals] = useState<Professional[]>([]);
    const [selectedClient, setSelectedClient] = useState<ConsultationRequest | null>(null);
    const [selectedProfessional, setSelectedProfessional] = useState<string>('');
    const [assignmentReason, setAssignmentReason] = useState('');
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [isAssigning, setIsAssigning] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // Assigned section state
    const [assignedClients, setAssignedClients] = useState<AssignedClient[]>([]);
    const [filteredAssignedClients, setFilteredAssignedClients] = useState<AssignedClient[]>([]);
    const [assignedSearchTerm, setAssignedSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('active');
    const [selectedAssignedClient, setSelectedAssignedClient] = useState<AssignedClient | null>(null);
    const [showUnassignModal, setShowUnassignModal] = useState(false);
    const [isUnassigning, setIsUnassigning] = useState(false);
    const [dropdownOpen, setDropdownOpen] = useState<string | null>(null);

    // Fetch data for assign section
    const fetchAssignData = useCallback(async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Get consultation requests
            const { data: assignableConsultations } = await supabase
                .from('consultation_requests')
                .select('*')
                .in('status', ['completed', 'scheduled', 'confirmed'])
                .is('assigned_nutritionist_id', null)
                .order('created_at', { ascending: false });

            if (assignableConsultations) {
                const transformedRequests: ConsultationRequest[] = assignableConsultations.map(request => ({
                    id: request.id,
                    client_id: request.client_id || request.id,
                    client_name: request.full_name || `Client ${request.id.slice(-4)}`,
                    client_email: request.email || 'No email provided',
                    health_goals: request.health_goals || 'Not specified',
                    current_challenges: request.current_challenges || 'Not specified',
                    status: request.status || 'pending',
                    created_at: request.created_at || new Date().toISOString(),
                    scheduled_date: request.scheduled_date,
                    scheduled_time: request.scheduled_time,
                    completed_at: request.completed_at
                }));
                setConsultationRequests(transformedRequests);
            }

            // Get professionals
            const { data: professionalProfiles } = await supabase
                .from('profiles')
                .select('id, full_name, email, bio, specializations, hourly_rate, timezone, role')
                .in('role', ['nutritionist', 'trainer', 'health_coach'])
                .not('full_name', 'is', null);

            if (professionalProfiles) {
                const professionalsWithCounts = await Promise.all(
                    professionalProfiles.map(async (profile) => {
                        const { count } = await supabase
                            .from('nutritionist_assignments')
                            .select('*', { count: 'exact', head: true })
                            .eq('nutritionist_id', profile.id)
                            .eq('status', 'active');

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
                            active_clients_count: count || 0
                        };
                    })
                );
                setProfessionals(professionalsWithCounts);
            }
        } catch (error) {
            console.error('Error fetching assign data:', error);
        }
    }, [supabase]);

    // Fetch data for assigned section
    const fetchAssignedData = useCallback(async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: profile } = await supabase
                .from('profiles')
                .select('id')
                .eq('user_id', user.id)
                .single();

            if (!profile) return;

            const { data: healthCoach } = await supabase
                .from('health_coaches')
                .select('id')
                .eq('profile_id', profile.id)
                .single();

            if (!healthCoach) return;

            // Get all assignments made by this health coach
            const { data: assignments } = await supabase
                .from('nutritionist_assignments')
                .select(`
                    id,
                    client_id,
                    assignment_reason,
                    assigned_at,
                    status,
                    client:client_id(
                        id,
                        full_name,
                        email,
                        user_id
                    ),
                    nutritionist:nutritionist_id(
                        id,
                        full_name,
                        email,
                        specializations
                    )
                `)
                .eq('assigned_by', healthCoach.id)
                .order('assigned_at', { ascending: false });

            if (assignments) {
                const processedClients = await Promise.all(
                    assignments.map(async (assignment) => {
                        const clientData = Array.isArray(assignment.client)
                            ? assignment.client[0]
                            : assignment.client;

                        const nutritionistData = Array.isArray(assignment.nutritionist)
                            ? assignment.nutritionist[0]
                            : assignment.nutritionist;

                        if (!clientData || !nutritionistData) return null;

                        // Get appointment stats
                        const { data: appointments } = await supabase
                            .from('appointments')
                            .select('start_time')
                            .eq('client_id', assignment.client_id)
                            .eq('professional_id', nutritionistData.id)
                            .order('start_time', { ascending: false });

                        const now = new Date();
                        const upcomingAppointments = appointments?.filter(
                            apt => new Date(apt.start_time) > now
                        ) || [];
                        const pastAppointments = appointments?.filter(
                            apt => new Date(apt.start_time) <= now
                        ) || [];

                        return {
                            id: assignment.id,
                            client_id: assignment.client_id,
                            assignment_reason: assignment.assignment_reason,
                            assigned_at: assignment.assigned_at,
                            status: assignment.status,
                            client: clientData,
                            nutritionist: nutritionistData,
                            sessions_count: appointments?.length || 0,
                            last_session_date: pastAppointments[0]?.start_time,
                            next_appointment: upcomingAppointments[0]
                        };
                    })
                );

                const validClients = processedClients.filter(client => client !== null) as AssignedClient[];
                setAssignedClients(validClients);
            }
        } catch (error) {
            console.error('Error fetching assigned data:', error);
        }
    }, [supabase]);

    // Main fetch function
    const fetchData = useCallback(async () => {
        setLoading(true);
        await Promise.all([fetchAssignData(), fetchAssignedData()]);
        setLoading(false);
    }, [fetchAssignData, fetchAssignedData]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Filter assigned clients
    useEffect(() => {
        let filtered = assignedClients;

        if (filterStatus !== 'all') {
            filtered = filtered.filter(client => client.status === filterStatus);
        }

        if (assignedSearchTerm.trim()) {
            const term = assignedSearchTerm.toLowerCase();
            filtered = filtered.filter(client =>
                client.client.full_name.toLowerCase().includes(term) ||
                client.client.email.toLowerCase().includes(term) ||
                client.nutritionist.full_name.toLowerCase().includes(term)
            );
        }

        setFilteredAssignedClients(filtered);
    }, [assignedClients, assignedSearchTerm, filterStatus]);

    // Filter consultation requests
    const filteredRequests = consultationRequests.filter(request =>
        request.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.client_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.health_goals.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Handle assignment
    const handleAssignProfessional = async () => {
        if (!selectedClient || !selectedProfessional) {
            alert('Please select both a client and a professional');
            return;
        }

        setIsAssigning(true);
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
                alert('Professional assigned successfully!');
                setShowAssignModal(false);
                setSelectedClient(null);
                setSelectedProfessional('');
                setAssignmentReason('');
                await fetchData();
            } else {
                if (result.error && result.error.includes('Client does not have an account')) {
                    alert('This client needs to create an account first before they can be assigned a nutritionist.');
                } else {
                    throw new Error(result.error || 'Failed to assign nutritionist');
                }
            }
        } catch (error) {
            console.error('Error assigning professional:', error);
            alert(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setIsAssigning(false);
        }
    };

    // Handle unassignment
    const handleUnassignClient = async (reason: string) => {
        if (!selectedAssignedClient) return;

        setIsUnassigning(true);
        try {
            const { error } = await supabase
                .from('nutritionist_assignments')
                .update({
                    status: 'inactive',
                    unassigned_at: new Date().toISOString(),
                    unassignment_reason: reason || 'Unassigned by health coach'
                })
                .eq('id', selectedAssignedClient.id);

            if (error) throw error;

            await fetchData();
            setShowUnassignModal(false);
            setSelectedAssignedClient(null);
            alert('Client unassigned successfully');
        } catch (error) {
            console.error('Error unassigning client:', error);
            alert('Failed to unassign client. Please try again.');
        } finally {
            setIsUnassigning(false);
        }
    };

    const getRecommendedProfessional = (clientGoals: string, clientChallenges: string) => {
        if (professionals.length === 0) return null;

        const goals = clientGoals.toLowerCase();
        const challenges = clientChallenges.toLowerCase();

        const nutritionist = professionals.find(professional => {
            if (professional.role !== 'nutritionist') return false;
            const specs = professional.specializations.map(s => s.toLowerCase()).join(' ');
            return (
                specs.includes('weight') || specs.includes('diet') || specs.includes('nutrition') ||
                goals.includes('weight') || goals.includes('diet') || goals.includes('nutrition')
            );
        });

        return nutritionist || professionals.find(p => p.role === 'nutritionist') || professionals[0];
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active':
                return 'bg-green-100 text-green-800 border-green-300';
            case 'inactive':
                return 'bg-gray-100 text-gray-800 border-gray-300';
            default:
                return 'bg-gray-100 text-gray-800 border-gray-300';
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="animate-spin text-teal-600" size={32} />
            </div>
        );
    }

    const activeClients = assignedClients.filter(c => c.status === 'active').length;
    const inactiveClients = assignedClients.filter(c => c.status === 'inactive').length;

    return (
        <div className="max-w-7xl mx-auto px-0 sm:px-4 py-8">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-4xl font-extrabold mb-2 text-gray-900">Professional Assignment Management</h1>
                <p className="text-gray-600">
                    Oversee new consultations and manage current client-nutritionist pairings.
                </p>
            </div>

            {/* Stats Cards - Updated with better design and Teal/Blue accents */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-lg">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-600 text-sm font-medium">Awaiting Assignment</p>
                            <p className="text-3xl font-bold text-blue-600 mt-1">{filteredRequests.length}</p>
                        </div>
                        <UserPlus className="text-blue-500 bg-blue-50 p-2 rounded-lg" size={40} />
                    </div>
                </div>

                <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-lg">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-600 text-sm font-medium">Active Assignments</p>
                            <p className="text-3xl font-bold text-teal-600 mt-1">{activeClients}</p>
                        </div>
                        <CheckCircle className="text-teal-500 bg-teal-50 p-2 rounded-lg" size={40} />
                    </div>
                </div>

                <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-lg">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-600 text-sm font-medium">Available Pros</p>
                            <p className="text-3xl font-bold text-purple-600 mt-1">{professionals.length}</p>
                        </div>
                        <Users className="text-purple-500 bg-purple-50 p-2 rounded-lg" size={40} />
                    </div>
                </div>

                <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-lg">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-600 text-sm font-medium">Total Assignments</p>
                            <p className="text-3xl font-bold text-gray-800 mt-1">{assignedClients.length}</p>
                        </div>
                        <Users className="text-gray-500 bg-gray-100 p-2 rounded-lg" size={40} />
                    </div>
                </div>
            </div>

            {/* Tab Navigation - Sharper, cleaner tab styles */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-lg mb-8">
                <div className="flex border-b border-gray-200">
                    <button
                        onClick={() => setActiveTab('assign')}
                        className={`flex-1 py-4 px-6 font-bold text-center transition-all duration-300 ${
                            activeTab === 'assign'
                                ? 'border-b-4 border-teal-600 text-teal-700 bg-teal-50'
                                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 border-b-4 border-transparent'
                        }`}
                    >
                        <UserPlus size={20} className="inline mr-2" />
                        Assign New Clients ({filteredRequests.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('assigned')}
                        className={`flex-1 py-4 px-6 font-bold text-center transition-all duration-300 ${
                            activeTab === 'assigned'
                                ? 'border-b-4 border-teal-600 text-teal-700 bg-teal-50'
                                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 border-b-4 border-transparent'
                        }`}
                    >
                        <Users size={20} className="inline mr-2" />
                        Manage Assignments ({assignedClients.length})
                    </button>
                </div>

                {/* Tab Content */}
                <div className="p-4 sm:p-6">
                    {activeTab === 'assign' ? (
                        /* Assign New Clients Section */
                        <div className="space-y-6">
                            {/* Search */}
                            <div className="flex gap-4 items-center justify-between">
                                <div className="relative flex-1 max-w-md">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                                    <input
                                        type="text"
                                        placeholder="Search clients by name, email, or goals..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-full focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-shadow"
                                    />
                                </div>
                                <div className="bg-teal-100 px-4 py-2 rounded-full hidden sm:block">
                                    <span className="font-semibold text-teal-800">
                                        {filteredRequests.length} clients available
                                    </span>
                                </div>
                            </div>

                            {filteredRequests.length === 0 ? (
                                <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center shadow-inner">
                                    <CheckCircle size={48} className="mx-auto text-teal-500 mb-4" />
                                    <h2 className="text-xl font-semibold mb-2">No Clients Available for Assignment</h2>
                                    <p className="text-gray-600">
                                        All completed consultation requests have been assigned to a professional.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {filteredRequests.map(request => {
                                        const recommendedProfessional = getRecommendedProfessional(
                                            request.health_goals,
                                            request.current_challenges
                                        );

                                        return (
                                            <div key={request.id} className="bg-white rounded-xl border border-gray-200 p-6 shadow-md hover:shadow-lg transition-shadow duration-300">
                                                <div className="flex items-start justify-between">
                                                    <div className="flex-1">
                                                        {/* Client Name/Email */}
                                                        <div className="flex items-center gap-3 mb-4 border-b pb-3">
                                                            <div className="w-10 h-10 bg-teal-600 rounded-full flex items-center justify-center flex-shrink-0">
                                                                <User size={20} className="text-white" />
                                                            </div>
                                                            <div>
                                                                <h3 className="text-xl font-bold text-gray-900">
                                                                    {request.client_name}
                                                                </h3>
                                                                <p className="text-sm text-gray-600">
                                                                    {request.client_email}
                                                                </p>
                                                            </div>
                                                        </div>

                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
                                                            <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                                                                <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-1">
                                                                    <TrendingUp size={16} /> 🎯 Goals
                                                                </h4>
                                                                <p className="text-sm text-blue-800">{request.health_goals}</p>
                                                            </div>
                                                            <div className="bg-orange-50 rounded-xl p-4 border border-orange-200">
                                                                <h4 className="font-semibold text-orange-900 mb-2 flex items-center gap-1">
                                                                    <AlertCircle size={16} /> ⚠️ Challenges
                                                                </h4>
                                                                <p className="text-sm text-orange-800">{request.current_challenges}</p>
                                                            </div>
                                                        </div>

                                                        {/* Recommended Professional Card */}
                                                        {recommendedProfessional && (
                                                            <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 mb-5">
                                                                <div className="flex items-center gap-2 mb-2">
                                                                    <Users size={18} className="text-teal-600" />
                                                                    <span className="font-semibold text-teal-800">
                                                                        Recommended Professional
                                                                    </span>
                                                                </div>
                                                                <p className="text-sm text-teal-900 font-medium">{recommendedProfessional.full_name}</p>
                                                                <p className="text-xs text-teal-700">
                                                                    {recommendedProfessional.specializations.length > 0
                                                                        ? `Specializes in: ${recommendedProfessional.specializations.join(', ')}`
                                                                        : 'General consultation specialist'
                                                                    }
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
                                                            className="bg-teal-600 text-white px-6 py-3 rounded-full hover:bg-teal-700 disabled:bg-gray-400 flex items-center gap-2 font-semibold transition-colors shadow-lg"
                                                        >
                                                            <UserPlus size={18} />
                                                            Assign Professional
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    ) : (
                        /* Assigned Clients Section - Cleaned up significantly */
                        <div className="space-y-6">
                            {/* Filters and Search */}
                            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                                <div className="relative flex-1 max-w-md">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                                    <input
                                        type="text"
                                        placeholder="Search assigned clients..."
                                        value={assignedSearchTerm}
                                        onChange={(e) => setAssignedSearchTerm(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-full focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-shadow"
                                    />
                                </div>

                                <div className="flex items-center gap-3">
                                    <Filter size={16} className="text-gray-500" />
                                    <select
                                        value={filterStatus}
                                        onChange={(e) => setFilterStatus(e.target.value as 'all' | 'active' | 'inactive')}
                                        className="px-4 py-2 border border-gray-300 rounded-full focus:ring-2 focus:ring-teal-500 focus:border-transparent text-gray-800 bg-white"
                                    >
                                        <option value="active">Active Only</option>
                                        <option value="inactive">Inactive Only</option>
                                        <option value="all">All Status</option>
                                    </select>
                                </div>
                            </div>

                            {filteredAssignedClients.length === 0 ? (
                                <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center shadow-inner">
                                    <Users size={48} className="mx-auto text-gray-400 mb-4" />
                                    <h2 className="text-xl font-semibold mb-2">
                                        {assignedClients.length === 0 ? 'No Assignments Yet' : 'No Clients Found'}
                                    </h2>
                                    <p className="text-gray-600">
                                        {assignedClients.length === 0
                                            ? "Clients you assign to nutritionists will appear here."
                                            : "Try adjusting your search or filter criteria."
                                        }
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {filteredAssignedClients.map((client) => (
                                        <div key={client.id} className="bg-white rounded-xl border border-gray-200 p-6 shadow-md hover:shadow-lg transition-shadow duration-300">
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    {/* Client Info */}
                                                    <div className="flex items-center gap-4 mb-4">
                                                        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                                                            <User size={24} className="text-gray-600" />
                                                        </div>
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-3 mb-1">
                                                                <h3 className="text-xl font-bold text-gray-900">
                                                                    {client.client.full_name}
                                                                </h3>
                                                                <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(client.status)}`}>
                                                                    {client.status.toUpperCase()}
                                                                </span>
                                                            </div>
                                                            <p className="text-gray-600">{client.client.email}</p>
                                                        </div>
                                                    </div>

                                                    {/* Assignment Details Grid - Cleaned up */}
                                                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
                                                        <div className="bg-teal-50 rounded-lg p-3">
                                                            <p className="text-xs font-semibold text-teal-700 uppercase mb-1">Professional</p>
                                                            <p className="text-sm font-bold text-teal-900">{client.nutritionist.full_name}</p>
                                                        </div>

                                                        <div className="bg-gray-50 rounded-lg p-3">
                                                            <p className="text-xs font-semibold text-gray-700 uppercase mb-1">Assigned</p>
                                                            <p className="text-sm font-bold text-gray-900">
                                                                {format(parseISO(client.assigned_at), 'MMM dd, yyyy')}
                                                            </p>
                                                        </div>

                                                        <div className="bg-gray-50 rounded-lg p-3">
                                                            <p className="text-xs font-semibold text-gray-700 uppercase mb-1">Sessions</p>
                                                            <p className="text-sm font-bold text-gray-900">
                                                                {client.sessions_count || 0}
                                                            </p>
                                                        </div>

                                                        {client.next_appointment && (
                                                            <div className="bg-blue-50 rounded-lg p-3">
                                                                <p className="text-xs font-semibold text-blue-700 uppercase mb-1">Next Session</p>
                                                                <p className="text-sm font-bold text-blue-900">
                                                                    {format(parseISO(client.next_appointment.start_time), 'MMM dd, h:mm a')}
                                                                </p>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Action Buttons */}
                                                    <div className="flex flex-wrap gap-3">
                                                        <Link
                                                            href={`/dashboard/messages?to=${client.client.id}`}
                                                            className="inline-flex items-center gap-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-full hover:bg-gray-200 transition-colors font-medium"
                                                        >
                                                            <MessageSquare size={16} />
                                                            Message
                                                        </Link>

                                                        {client.status === 'active' && (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setSelectedAssignedClient(client);
                                                                    setShowUnassignModal(true);
                                                                }}
                                                                className="inline-flex items-center gap-2 bg-red-50 text-red-700 px-4 py-2 rounded-full hover:bg-red-100 transition-colors font-medium border border-red-200"
                                                            >
                                                                <UserMinus size={16} />
                                                                Unassign
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Dropdown Menu - Simple More button removed, main actions pulled out */}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Assignment Modal (Redesigned) */}
            {showAssignModal && selectedClient && (
                <div className="fixed inset-0 bg-gray-900 bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
                        <h2 className="text-3xl font-extrabold mb-6 text-gray-900">
                            Assign Professional to <span className="text-teal-600">{selectedClient.client_name}</span>
                        </h2>

                        <div className="space-y-6">
                            {/* Client Summary */}
                            <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                                <h3 className="font-bold mb-3 text-gray-800 flex items-center gap-2"><User size={18} className="text-teal-600" /> Client Profile</h3>
                                <div className="text-sm text-gray-700 grid grid-cols-2 gap-y-2">
                                    <p><span className="font-semibold text-blue-700">Goals:</span> {selectedClient.health_goals}</p>
                                    <p><span className="font-semibold text-orange-700">Challenges:</span> {selectedClient.current_challenges}</p>
                                    <p className="col-span-2"><span className="font-semibold">Email:</span> {selectedClient.client_email}</p>
                                </div>
                            </div>

                            {/* Professional Selection */}
                            <div>
                                <label className="block font-bold mb-3 text-gray-800">Select Professional</label>
                                <div className="space-y-3 max-h-72 overflow-y-auto pr-2 border-y py-3">
                                    {professionals.map(professional => (
                                        <label key={professional.profile_id} className={`flex items-start gap-4 p-4 border-2 rounded-xl cursor-pointer transition-colors duration-200 ${selectedProfessional === professional.profile_id ? 'border-teal-500 bg-teal-50 shadow-md' : 'border-gray-200 hover:border-teal-300 bg-white'}`}>
                                            <input
                                                type="radio"
                                                name="professional"
                                                value={professional.profile_id}
                                                checked={selectedProfessional === professional.profile_id}
                                                onChange={(e) => setSelectedProfessional(e.target.value)}
                                                className="mt-2 w-4 h-4 text-teal-600 border-gray-300 focus:ring-teal-500"
                                            />
                                            <div className="flex-1">
                                                <h4 className="font-bold text-gray-900 flex items-center gap-2">
                                                    {professional.full_name}
                                                    <span className="text-xs font-medium text-gray-500 capitalize">({professional.role})</span>
                                                </h4>
                                                <p className="text-sm text-gray-600">
                                                    <span className="font-semibold">Clients:</span> {professional.active_clients_count}
                                                </p>
                                                <p className="text-sm text-gray-700">
                                                    {professional.specializations.length > 0
                                                        ? professional.specializations.join(' | ')
                                                        : 'General consultation'
                                                    }
                                                </p>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Assignment Reason */}
                            <div>
                                <label className="block font-bold mb-3 text-gray-800">Assignment Reason (Optional)</label>
                                <textarea
                                    value={assignmentReason}
                                    onChange={(e) => setAssignmentReason(e.target.value)}
                                    rows={3}
                                    placeholder="e.g., Why is this professional a good fit? (Based on their specialization in Weight Loss)"
                                    className="w-full p-4 border-2 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors duration-200 bg-gray-50 resize-none"
                                />
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-4 mt-8">
                            <button
                                onClick={handleAssignProfessional}
                                disabled={!selectedProfessional || isAssigning}
                                className="flex-1 bg-teal-600 text-white font-bold py-4 rounded-full hover:bg-teal-700 disabled:bg-gray-400 transition-colors shadow-lg flex items-center justify-center gap-2"
                            >
                                {isAssigning ? <Loader2 size={20} className="animate-spin" /> : <UserPlus size={20} />}
                                {isAssigning ? 'Assigning...' : 'Assign Professional'}
                            </button>
                            <button
                                onClick={() => {
                                    setShowAssignModal(false);
                                    setSelectedClient(null);
                                    setSelectedProfessional('');
                                    setAssignmentReason('');
                                }}
                                className="flex-1 bg-gray-200 text-gray-800 font-bold py-4 rounded-full hover:bg-gray-300 transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Unassign Modal */}
            {showUnassignModal && selectedAssignedClient && (
                <UnassignModal
                    client={selectedAssignedClient}
                    onClose={() => {
                        setShowUnassignModal(false);
                        setSelectedAssignedClient(null);
                    }}
                    onConfirm={handleUnassignClient}
                    isLoading={isUnassigning}
                />
            )}
        </div>
    );
}