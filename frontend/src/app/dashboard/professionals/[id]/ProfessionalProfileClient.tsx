// app/dashboard/professionals/[id]/ProfessionalProfileClient.tsx
'use client';

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useEffect, useState } from 'react';
import { Star, MessageSquare } from 'lucide-react';

// Define types for our data
type ProfessionalProfile = {
    id: string;
    full_name: string;
    bio: string | null;
    specialties: string[] | null;
    role: 'nutritionist' | 'trainer';
};

export default function ProfessionalProfileClient({ professionalId }: { professionalId: string }) {
    const supabase = createClientComponentClient();
    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState<ProfessionalProfile | null>(null);
    const [activeTab, setActiveTab] = useState('reviews');

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            const { data: profileData } = await supabase
                .from('profiles')
                .select('id, full_name, bio, specialties, role')
                .eq('id', professionalId)
                .single();
            setProfile(profileData);
            setLoading(false);
        };
        fetchData();
    }, [supabase, professionalId]);

    if (loading) return <div className="text-center p-8 text-gray-500">Loading Profile...</div>;
    if (!profile) return <div className="text-center p-8 text-gray-500">Professional not found.</div>;

    return (
        <div className="max-w-5xl mx-auto text-gray-800">
            {/* Profile Header */}
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm mb-8">
                {/* Banner Image */}
                <div className="h-40 bg-gray-200 rounded-t-2xl"></div>
                <div className="p-6">
                    <div className="flex items-end -mt-20">
                        {/* Profile Picture */}
                        <div className="w-32 h-32 rounded-full bg-gray-300 border-4 border-white flex-shrink-0"></div>
                        <div className="ml-6 flex-grow">
                            <h1 className="text-3xl font-bold">{profile.full_name}</h1>
                            <p className="text-gray-600 capitalize">{profile.role}</p>
                        </div>
                        <div className="flex gap-4">
                            <button className="bg-white border border-gray-300 text-gray-800 font-bold py-2 px-4 rounded-lg hover:bg-gray-50">
                                <MessageSquare size={20} className="inline-block mr-2" />
                                Chat With Coach
                            </button>
                            <button className="bg-gray-800 text-white font-bold py-2 px-4 rounded-lg hover:bg-gray-700">
                                See Plans
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Profile Body */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Sidebar */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white border border-gray-200 rounded-2xl p-6">
                        <h3 className="text-lg font-bold mb-4">Speciality</h3>
                        <div className="flex flex-wrap gap-2">
                            {profile.specialties?.map(spec => (
                                <span key={spec} className="bg-gray-100 text-gray-700 text-sm px-3 py-1 rounded-full">{spec}</span>
                            )) || <p className="text-gray-500">No specialties listed.</p>}
                        </div>
                    </div>
                    <div className="bg-white border border-gray-200 rounded-2xl p-6">
                        <h3 className="text-lg font-bold mb-4">Interested In</h3>
                        <div className="flex flex-wrap gap-2">
                            <span className="bg-gray-100 text-gray-700 text-sm px-3 py-1 rounded-full">Bodybuilding</span>
                            <span className="bg-gray-100 text-gray-700 text-sm px-3 py-1 rounded-full">Meditation</span>
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="lg:col-span-2">
                    <div className="bg-white border border-gray-200 rounded-2xl">
                        {/* Tabs */}
                        <div className="flex border-b border-gray-200">
                            <button onClick={() => setActiveTab('reviews')} className={`py-4 px-6 font-semibold ${activeTab === 'reviews' ? 'border-b-2 border-gray-800 text-gray-800' : 'text-gray-500'}`}>Reviews</button>
                            <button onClick={() => setActiveTab('about')} className={`py-4 px-6 font-semibold ${activeTab === 'about' ? 'border-b-2 border-gray-800 text-gray-800' : 'text-gray-500'}`}>About Me</button>
                        </div>
                        <div className="p-6">
                            {activeTab === 'reviews' && (
                                <div>
                                    <div className="flex items-center mb-4">
                                        <h3 className="text-xl font-bold">5/5</h3>
                                        <div className="flex items-center gap-1 text-yellow-400 ml-2">
                                            <Star size={20} fill="currentColor" />
                                            <Star size={20} fill="currentColor" />
                                            <Star size={20} fill="currentColor" />
                                            <Star size={20} fill="currentColor" />
                                            <Star size={20} fill="currentColor" />
                                        </div>
                                    </div>
                                    {/* Placeholder for a review */}
                                    <div className="border-t border-gray-200 pt-4">
                                        <div className="flex items-center mb-2">
                                            <div className="w-10 h-10 rounded-full bg-gray-200 mr-4"></div>
                                            <div>
                                                <p className="font-semibold">Saurabh</p>
                                                <p className="text-sm text-gray-500">29 May 2025</p>
                                            </div>
                                        </div>
                                        <p className="text-gray-600">Aditya is a great coach. He has always been there for me. His expertise is immense.</p>
                                    </div>
                                </div>
                            )}
                            {activeTab === 'about' && (
                                <div>
                                    <p className="text-gray-600 whitespace-pre-wrap">{profile.bio || "This coach has not written a bio yet."}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
