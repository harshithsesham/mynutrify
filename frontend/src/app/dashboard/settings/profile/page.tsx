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

    const handleAvailabilityChange = (index: number, field: keyof Availability, value: string | number) => {
        const newAvailability = [...availability];
        newAvailability[index] = { ...newAvailability[index], [field]: value };
        setAvailability(newAvailability);
    };

    const addAvailabilitySlot = (day: number) => {
        setAvailability([...availability, { day_of_week: day, start_time: '09:00', end_time: '17:00' }]);
    };

    const removeAvailabilitySlot = (index: number) => {
        setAvailability(availability.filter((_, i) => i !== index));
    };

    const handleSaveChanges = async () => {
        if (!profileId || !profile) return;
        setLoading(true);

        // 1. Update Profile Information
        const { error: profileError } = await supabase
            .from('profiles')
            .update({
                bio: profile.bio,
                specialties: profile.specialties,
                hourly_rate: profile.hourly_rate,
                interests: profile.interests
            })
            .eq('id', profileId);

        if (profileError) {
            alert('Error saving profile: ' + profileError.message);
            setLoading(false);
            return;
        }

        // 2. Delete all existing availability for this professional
        const { error: deleteError } = await supabase.from('availability').delete().eq('professional_id', profileId);
        if (deleteError) {
            alert('Error clearing old schedule: ' + deleteError.message);
            setLoading(false);
            return;
        }

        // 3. Insert the new availability schedule
        if (availability.length > 0) {
            const availabilityToSave = availability.map(slot => ({
                professional_id: profileId,
                day_of_week: slot.day_of_week,
                start_time: slot.start_time,
                end_time: slot.end_time,
            }));
            const { error: availabilityError } = await supabase.from('availability').insert(availabilityToSave);
            if (availabilityError) {
                alert('Error saving new availability: ' + availabilityError.message);
            } else {
                alert('Profile and availability saved successfully!');
            }
        } else {
            alert('Profile saved successfully! No availability was set.');
        }

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
                                {loading ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Profile Body */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Sidebar for Profile Details */}
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

                {/* Main Content for Bio and Availability */}
                <div className="lg:col-span-2">
                    <div className="bg-white border border-gray-200 rounded-2xl p-6">
                        <h2 className="text-2xl font-semibold mb-6 text-gray-800">Your Bio</h2>
                        <textarea value={profile?.bio || ''} onChange={(e) => handleProfileChange('bio', e.target.value)} className="w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-gray-800" rows={8} placeholder="Tell clients about yourself..."/>
                    </div>
                </div>
            </div>

            {/* Availability Section */}
            <div className="bg-white border border-gray-200 p-8 rounded-2xl shadow-sm mt-8">
                <h2 className="text-2xl font-semibold mb-6 text-gray-800">Set Your Weekly Availability</h2>
                <div className="space-y-6">
                    {daysOfWeek.map((day, dayIndex) => (
                        <div key={dayIndex} className="border-t border-gray-200 pt-4">
                            <h3 className="text-lg font-medium text-gray-800 mb-3">{day}</h3>
                            {availability.filter(a => a.day_of_week === dayIndex).map((slot) => {
                                const overallIndex = availability.findIndex(a => a === slot);
                                return (
                                    <div key={slot.id || `new-${overallIndex}`} className="flex items-center gap-4 mb-2">
                                        <input type="time" value={slot.start_time} onChange={e => handleAvailabilityChange(overallIndex, 'start_time', e.target.value)} className="bg-gray-50 border border-gray-300 rounded-lg px-3 py-2" />
                                        <span className="text-gray-500">to</span>
                                        <input type="time" value={slot.end_time} onChange={e => handleAvailabilityChange(overallIndex, 'end_time', e.target.value)} className="bg-gray-50 border border-gray-300 rounded-lg px-3 py-2" />
                                        <button onClick={() => removeAvailabilitySlot(overallIndex)} className="text-red-500 hover:text-red-700"><Trash2 size={20} /></button>
                                    </div>
                                );
                            })}
                            <button onClick={() => addAvailabilitySlot(dayIndex)} className="flex items-center gap-2 text-gray-800 hover:text-gray-600 font-semibold mt-2">
                                <PlusCircle size={20} /> Add Time Slot
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}