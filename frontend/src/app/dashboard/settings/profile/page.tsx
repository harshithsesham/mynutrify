// app/dashboard/settings/profile/page.tsx
'use client';

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useCallback, useEffect, useState } from 'react';
import { PlusCircle, Trash2 } from 'lucide-react';

type Profile = {
    full_name: string;
    bio: string | null;
    specialties: string[] | null;
    hourly_rate: number | null;
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

    const getProfileData = useCallback(async (userId: string) => {
        setLoading(true);
        const { data: profileData } = await supabase
            .from('profiles')
            .select('id, full_name, bio, specialties, hourly_rate')
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
            if (user) {
                await getProfileData(user.id);
            }
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

        const { error: profileError } = await supabase
            .from('profiles')
            .update({ bio: profile.bio, specialties: profile.specialties, hourly_rate: profile.hourly_rate })
            .eq('id', profileId);
        if (profileError) alert('Error saving profile: ' + profileError.message);

        const availabilityToSave = availability.map(slot => ({ ...slot, professional_id: profileId }));
        const { error: availabilityError } = await supabase
            .from('availability')
            .upsert(availabilityToSave, { onConflict: 'professional_id,day_of_week,start_time' });
        if (availabilityError) alert('Error saving availability: ' + availabilityError.message);
        else alert('Changes saved successfully!');

        setLoading(false);
    };

    if (loading && !profile) return <div className="text-center p-8 text-gray-500">Loading...</div>;

    return (
        <div className="max-w-4xl mx-auto text-gray-800">
            <h1 className="text-4xl font-bold mb-8">Profile & Availability</h1>

            <div className="bg-white border border-gray-200 p-8 rounded-2xl mb-8 shadow-sm">
                <h2 className="text-2xl font-semibold mb-6 text-gray-800">Your Professional Profile</h2>
                <div className="space-y-6">
                    <div>
                        <label className="block text-gray-600 font-medium mb-2">Bio</label>
                        <textarea value={profile?.bio || ''} onChange={(e) => handleProfileChange('bio', e.target.value)} className="w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-gray-800" rows={4} placeholder="Tell clients about yourself..."/>
                    </div>
                    <div>
                        <label className="block text-gray-600 font-medium mb-2">Specialties (comma-separated)</label>
                        <input type="text" value={profile?.specialties?.join(', ') || ''} onChange={(e) => handleProfileChange('specialties', e.target.value.split(',').map(s => s.trim()))} className="w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-gray-800" placeholder="e.g., Weight Loss, Sports Nutrition"/>
                    </div>
                    <div>
                        <label className="block text-gray-600 font-medium mb-2">Hourly Rate (₹)</label>
                        <input type="number" value={profile?.hourly_rate || ''} onChange={(e) => handleProfileChange('hourly_rate', parseFloat(e.target.value) || null)} className="w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-gray-800" placeholder="1500"/>
                    </div>
                </div>
            </div>

            <div className="bg-white border border-gray-200 p-8 rounded-2xl shadow-sm">
                <h2 className="text-2xl font-semibold mb-6 text-gray-800">Set Your Weekly Availability</h2>
                <div className="space-y-6">
                    {daysOfWeek.map((day, dayIndex) => (
                        <div key={dayIndex} className="border-t border-gray-200 pt-4">
                            <h3 className="text-lg font-medium text-gray-800 mb-3">{day}</h3>
                            {availability.filter(a => a.day_of_week === dayIndex).map((slot) => {
                                const overallIndex = availability.findIndex(a => a === slot);
                                return (
                                    <div key={overallIndex} className="flex items-center gap-4 mb-2">
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

            <div className="mt-8 flex justify-end">
                <button onClick={handleSaveChanges} disabled={loading} className="bg-gray-800 hover:bg-gray-700 text-white font-bold py-3 px-6 rounded-lg transition duration-300 disabled:bg-gray-500">
                    {loading ? 'Saving...' : 'Save Changes'}
                </button>
            </div>
        </div>
    );
}