// app/dashboard/settings/profile/page.tsx
'use client';

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useCallback, useEffect, useState } from 'react';
import { PlusCircle, Trash2, Star } from 'lucide-react';

type Profile = {
    full_name: string;
    bio: string | null;
    specialties: string[] | null;
    hourly_rate: number | null;
    interests: string[] | null;
};

type Availability = {
    id?: number;
    day_of_week: number;
    start_time: string;
    end_time: string;
};

const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function ProfileSettingsPage() {
    const supabase = createClientComponentClient();
    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [availability, setAvailability] = useState<Availability[]>([]);
    const [profileId, setProfileId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState('bio'); // Changed default tab to 'bio'

    const getProfileData = useCallback(async (userId: string) => {
        setLoading(true);
        const { data: profileData } = await supabase
            .from('profiles')
            .select('id, full_name, bio, specialties, hourly_rate, interests')
            .eq('user_id', userId)
            .single();

        if (profileData) {
            setProfile(profileData);
            setProfileId(profileData.id);
            const { data: availabilityData } = await supabase
                .from('availability')
                .select('id, day_of_week, start_time, end_time')
                .eq('professional_id', profileData.id);
            setAvailability(availabilityData || []);
        }
        setLoading(false);
    }, [supabase]);

    useEffect(() => {
        const getUserAndData = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) await getProfileData(user.id);
        };
        getUserAndData();
    }, [supabase, getProfileData]);

    const handleProfileChange = (field: keyof Profile, value: string | string[] | number | null) => {
        if (profile) setProfile({ ...profile, [field]: value });
    };

    const handleSaveChanges = async () => {
        if (!profileId || !profile) return;
        setLoading(true);

        const { error: profileError } = await supabase
            .from('profiles')
            .update({
                bio: profile.bio,
                specialties: profile.specialties,
                hourly_rate: profile.hourly_rate,
                interests: profile.interests
            })
            .eq('id', profileId);
        if (profileError) alert('Error saving profile: ' + profileError.message);
        else alert('Profile changes saved successfully!');

        setLoading(false);
    };

    if (loading && !profile) return <div className="text-center p-8 text-gray-500">Loading...</div>;

    return (
        <div className="max-w-5xl mx-auto text-gray-800">
            {/* Profile Header */}
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm mb-8">
                <div className="h-40 bg-gray-200 rounded-t-2xl"></div>
                <div className="p-6">
                    <div className="flex items-end -mt-20">
                        <div className="w-32 h-32 rounded-full bg-gray-300 border-4 border-white flex-shrink-0"></div>
                        <div className="ml-6 flex-grow">
                            <h1 className="text-3xl font-bold">{profile?.full_name}</h1>
                            <p className="text-gray-600 capitalize">Your Profile Settings</p>
                        </div>
                        <div className="flex gap-4">
                            <button onClick={handleSaveChanges} disabled={loading} className="bg-gray-800 text-white font-bold py-2 px-6 rounded-lg hover:bg-gray-700 disabled:bg-gray-400">
                                {loading ? 'Saving...' : 'Save Profile'}
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
                        <label className="text-lg font-bold mb-4 block">Speciality (comma-separated)</label>
                        <input type="text" value={profile?.specialties?.join(', ') || ''} onChange={(e) => handleProfileChange('specialties', e.target.value.split(',').map(s => s.trim()))} className="w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-gray-800" placeholder="e.g., Weight Loss"/>
                    </div>
                    <div className="bg-white border border-gray-200 rounded-2xl p-6">
                        <label className="text-lg font-bold mb-4 block">Interested In (comma-separated)</label>
                        <input type="text" value={profile?.interests?.join(', ') || ''} onChange={(e) => handleProfileChange('interests', e.target.value.split(',').map(s => s.trim()))} className="w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-gray-800" placeholder="e.g., Bodybuilding"/>
                    </div>
                </div>

                {/* Main Content */}
                <div className="lg:col-span-2">
                    <div className="bg-white border border-gray-200 rounded-2xl">
                        <div className="flex border-b border-gray-200">
                            <button onClick={() => setActiveTab('bio')} className={`py-4 px-6 font-semibold ${activeTab === 'bio' ? 'border-b-2 border-gray-800 text-gray-800' : 'text-gray-500'}`}>Bio</button>
                            <button onClick={() => setActiveTab('reviews')} className={`py-4 px-6 font-semibold ${activeTab === 'reviews' ? 'border-b-2 border-gray-800 text-gray-800' : 'text-gray-500'}`}>Reviews</button>
                        </div>
                        <div className="p-6">
                            {activeTab === 'bio' && (
                                <div>
                                    <label className="block text-gray-600 font-medium mb-2">Your Bio</label>
                                    <textarea value={profile?.bio || ''} onChange={(e) => handleProfileChange('bio', e.target.value)} className="w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-gray-800" rows={8} placeholder="Tell clients about yourself..."/>
                                </div>
                            )}
                            {activeTab === 'reviews' && (
                                <div className="text-center text-gray-500 p-8">
                                    <h3 className="text-xl font-bold mb-2">Your Reviews</h3>
                                    <p>This is where reviews from your clients will appear on your public profile.</p>
                                    <div className="flex items-center justify-center gap-1 text-yellow-400 mt-4">
                                        <Star size={20} /><Star size={20} /><Star size={20} /><Star size={20} /><Star size={20} />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
