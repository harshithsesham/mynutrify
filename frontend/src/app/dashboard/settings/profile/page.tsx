// app/dashboard/settings/profile/page.tsx
'use client';

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useCallback, useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';

// Type definitions for the profile and availability data
type Profile = {
    full_name: string;
    bio: string | null;
    specialties: string[] | null;
    interests: string[] | null;
    hourly_rate: number | null;
};

type Availability = {
    id?: number;
    day_of_week: number;
    start_time: string;
    end_time: string;
};

const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const timeOptions = Array.from({ length: 24 * 2 }, (_, i) => {
    const hour = Math.floor(i / 2);
    const minute = (i % 2) * 30;
    const formattedHour = String(hour).padStart(2, '0');
    const formattedMinute = String(minute).padStart(2, '0');
    return `${formattedHour}:${formattedMinute}`;
});

export default function ProfileSettingsPage() {
    const supabase = createClientComponentClient();
    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [availability, setAvailability] = useState<Availability[]>([]);
    const [profileId, setProfileId] = useState<string | null>(null);

    // Fetches all necessary data for the page
    const getProfileData = useCallback(async (userId: string) => {
        setLoading(true);
        const { data: profileData } = await supabase
            .from('profiles')
            .select('id, full_name, bio, specialties, interests, hourly_rate')
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

    // Handlers for state changes
    const handleProfileChange = (field: keyof Profile, value: string | string[] | number | null) => {
        if (profile) setProfile({ ...profile, [field]: value });
    };

    const handleAvailabilityChange = (dayIndex: number, field: 'start_time' | 'end_time', value: string) => {
        const existingSlotIndex = availability.findIndex(slot => slot.day_of_week === dayIndex);
        const newAvailability = [...availability];
        if (existingSlotIndex > -1) {
            newAvailability[existingSlotIndex] = { ...newAvailability[existingSlotIndex], [field]: value };
        } else {
            newAvailability.push({ day_of_week: dayIndex, start_time: '09:00', end_time: '17:00', [field]: value });
        }
        setAvailability(newAvailability);
    };

    const toggleDayAvailability = (dayIndex: number, isEnabled: boolean) => {
        if (isEnabled) {
            setAvailability([...availability, { day_of_week: dayIndex, start_time: '09:00', end_time: '17:00' }]);
        } else {
            setAvailability(availability.filter(slot => slot.day_of_week !== dayIndex));
        }
    };

    // Logic to save all changes to the database
    const handleSaveChanges = async () => {
        if (!profileId || !profile) return;
        setLoading(true);

        const { error: profileError } = await supabase
            .from('profiles')
            .update({
                bio: profile.bio,
                specialties: profile.specialties,
                interests: profile.interests,
                hourly_rate: profile.hourly_rate
            })
            .eq('id', profileId);

        if (profileError) {
            alert('Error saving profile: ' + profileError.message);
            setLoading(false);
            return;
        }

        const { error: deleteError } = await supabase.from('availability').delete().eq('professional_id', profileId);
        if (deleteError) {
            alert('Error clearing schedule: ' + deleteError.message);
            setLoading(false);
            return;
        }

        if (availability.length > 0) {
            const availabilityToSave = availability.map(slot => ({
                professional_id: profileId,
                day_of_week: slot.day_of_week,
                start_time: slot.start_time,
                end_time: slot.end_time,
            }));
            const { error: insertError } = await supabase.from('availability').insert(availabilityToSave);
            if (insertError) {
                alert('Error saving availability: ' + insertError.message);
            } else {
                alert('Changes saved successfully!');
            }
        } else {
            alert('Profile saved successfully! Availability schedule is empty.');
        }
        setLoading(false);
    };

    if (loading) return <div className="text-center p-8 text-gray-500">Loading Settings...</div>;

    return (
        <div className="max-w-5xl mx-auto text-gray-800 space-y-8">
            <h1 className="text-3xl font-bold">Settings</h1>

            {/* Profile Information Section */}
            <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm">
                <h2 className="text-2xl font-semibold mb-6">Your Profile Information</h2>
                <div className="space-y-6">
                    <div>
                        <label className="block text-gray-600 font-medium mb-2">Bio</label>
                        <textarea value={profile?.bio || ''} onChange={(e) => handleProfileChange('bio', e.target.value)} className="w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-gray-800" rows={5} placeholder="Tell clients about yourself..."/>
                    </div>
                    <div>
                        <label className="block text-gray-600 font-medium mb-2">Specialties (comma-separated)</label>
                        <input type="text" value={profile?.specialties?.join(', ') || ''} onChange={(e) => handleProfileChange('specialties', e.target.value.split(',').map(s => s.trim()))} className="w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-gray-800" placeholder="e.g., Weight Loss, Sports Nutrition"/>
                    </div>
                    <div>
                        <label className="block text-gray-600 font-medium mb-2">Interests (comma-separated)</label>
                        <input type="text" value={profile?.interests?.join(', ') || ''} onChange={(e) => handleProfileChange('interests', e.target.value.split(',').map(s => s.trim()))} className="w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-gray-800" placeholder="e.g., Bodybuilding, Meditation"/>
                    </div>
                    <div>
                        <label className="block text-gray-600 font-medium mb-2">Hourly Rate (₹)</label>
                        <input type="number" value={profile?.hourly_rate || ''} onChange={(e) => handleProfileChange('hourly_rate', parseFloat(e.target.value) || null)} className="w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-gray-800" placeholder="1500"/>
                    </div>
                </div>
            </div>

            {/* Redesigned Availability Section */}
            <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm">
                <h2 className="text-2xl font-semibold mb-2">Set Your Weekly Availability</h2>
                <p className="text-gray-500 mb-6">Define your standard working hours. Clients will be able to book appointments during these times.</p>

                <div className="space-y-4">
                    {daysOfWeek.map((day, dayIndex) => {
                        const daySlot = availability.find(slot => slot.day_of_week === dayIndex);
                        const isEnabled = !!daySlot;
                        return (
                            <div key={day} className="grid grid-cols-1 md:grid-cols-3 items-center gap-4 p-4 border-b border-gray-200">
                                <div className="flex items-center">
                                    <input type="checkbox" checked={isEnabled} onChange={(e) => toggleDayAvailability(dayIndex, e.target.checked)} className="h-5 w-5 rounded border-gray-300 text-gray-800 focus:ring-gray-700 mr-4"/>
                                    <span className="font-medium">{day}</span>
                                </div>
                                <div className={`col-span-2 flex items-center gap-4 transition-opacity ${isEnabled ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                                    <select value={daySlot?.start_time || '09:00'} onChange={(e) => handleAvailabilityChange(dayIndex, 'start_time', e.target.value)} className="bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 w-full">
                                        {timeOptions.map(time => <option key={time} value={time}>{time}</option>)}
                                    </select>
                                    <span className="text-gray-500">-</span>
                                    <select value={daySlot?.end_time || '17:00'} onChange={(e) => handleAvailabilityChange(dayIndex, 'end_time', e.target.value)} className="bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 w-full">
                                        {timeOptions.map(time => <option key={time} value={time}>{time}</option>)}
                                    </select>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
            <div className="mt-8 flex justify-end">
                <button onClick={handleSaveChanges} disabled={loading} className="bg-gray-800 text-white font-bold py-3 px-6 rounded-lg hover:bg-gray-700 disabled:bg-gray-500">
                    {loading ? 'Saving...' : 'Save Changes'}
                </button>
            </div>
        </div>
    );
}
