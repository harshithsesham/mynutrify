// app/dashboard/settings/profile/page.tsx
'use client';

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useCallback, useEffect, useState, Suspense } from 'react';
import { CheckCircle, Globe, User, Calendar, DollarSign, Sparkles, Clock, Save, AlertCircle, Check } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';

// Type definitions
type Profile = {
    full_name: string;
    bio: string | null;
    specialties: string[] | null;
    interests: string[] | null;
    hourly_rate: number | null;
    google_refresh_token: string | null;
    timezone: string;
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

// Common timezones organized by region
const timezoneGroups = {
    'Americas': [
        { value: 'America/Los_Angeles', label: 'Pacific Time (Los Angeles)', offset: 'UTC-8' },
        { value: 'America/Denver', label: 'Mountain Time (Denver)', offset: 'UTC-7' },
        { value: 'America/Chicago', label: 'Central Time (Chicago)', offset: 'UTC-6' },
        { value: 'America/New_York', label: 'Eastern Time (New York)', offset: 'UTC-5' },
        { value: 'America/Sao_Paulo', label: 'Brazil Time (São Paulo)', offset: 'UTC-3' },
    ],
    'Europe': [
        { value: 'Europe/London', label: 'British Time (London)', offset: 'UTC+0' },
        { value: 'Europe/Paris', label: 'Central European (Paris)', offset: 'UTC+1' },
        { value: 'Europe/Moscow', label: 'Moscow Time', offset: 'UTC+3' },
    ],
    'Asia & Pacific': [
        { value: 'Asia/Dubai', label: 'Gulf Standard (Dubai)', offset: 'UTC+4' },
        { value: 'Asia/Kolkata', label: 'India Standard Time', offset: 'UTC+5:30' },
        { value: 'Asia/Bangkok', label: 'Indochina (Bangkok)', offset: 'UTC+7' },
        { value: 'Asia/Shanghai', label: 'China Standard Time', offset: 'UTC+8' },
        { value: 'Asia/Tokyo', label: 'Japan Standard Time', offset: 'UTC+9' },
        { value: 'Australia/Sydney', label: 'Sydney Time', offset: 'UTC+10' },
        { value: 'Pacific/Auckland', label: 'New Zealand Time', offset: 'UTC+12' },
    ],
};

// Component that uses useSearchParams (needs to be wrapped in Suspense)
function ProfileSettingsContent() {
    const supabase = createClientComponentClient();
    const router = useRouter();
    const searchParams = useSearchParams();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [availability, setAvailability] = useState<Availability[]>([]);
    const [profileId, setProfileId] = useState<string | null>(null);
    const [detectedTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);
    const [showSuccess, setShowSuccess] = useState(false);
    const [activeSection, setActiveSection] = useState<'profile' | 'availability' | 'integrations'>('profile');
    const [isCalendarConnected, setIsCalendarConnected] = useState(false);

    // Check for URL parameters from OAuth callback
    const success = searchParams.get('success');
    const error = searchParams.get('error');
    const shouldRefresh = searchParams.get('refresh');

    // Check calendar connection status
    const checkCalendarConnection = useCallback(async () => {
        if (profile) {
            const hasToken = !!profile.google_refresh_token;
            setIsCalendarConnected(hasToken);
            console.log('Calendar connected status:', hasToken);
        }
    }, [profile]);

    // Fetches all necessary data
    const getProfileData = useCallback(async (userId: string) => {
        setLoading(true);
        const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('id, full_name, bio, specialties, interests, hourly_rate, google_refresh_token, timezone')
            .eq('user_id', userId)
            .single();

        if (profileError) {
            console.error('Error loading profile:', profileError);
        }

        if (profileData) {
            setProfile({
                ...profileData,
                timezone: profileData.timezone || detectedTimezone
            });
            setProfileId(profileData.id);

            // Check calendar connection status (only check refresh token)
            const hasToken = !!profileData.google_refresh_token;
            setIsCalendarConnected(hasToken);
            console.log('Calendar connected status:', hasToken, 'Refresh token present:', !!profileData.google_refresh_token);

            // Get availability data
            const { data: availabilityData } = await supabase
                .from('availability')
                .select('id, day_of_week, start_time, end_time')
                .eq('professional_id', profileData.id);
            setAvailability(availabilityData || []);
        }
        setLoading(false);
    }, [supabase, detectedTimezone]);

    useEffect(() => {
        const getUserAndData = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) await getProfileData(user.id);
        };
        getUserAndData();
    }, [supabase, getProfileData]);

    // Re-check connection status if redirected from OAuth
    useEffect(() => {
        if (success === 'calendar_connected' || shouldRefresh) {
            console.log('OAuth callback detected, refreshing connection status');
            // Small delay to ensure database is updated
            setTimeout(async () => {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    getProfileData(user.id);
                }
            }, 1000);
        }
    }, [success, shouldRefresh, supabase, getProfileData]);

    // Show success/error messages
    useEffect(() => {
        if (success === 'calendar_connected') {
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 5000);
            // Clean up URL parameters
            router.replace('/dashboard/settings/profile', { scroll: false });
        } else if (error) {
            // Handle different error types
            const message = searchParams.get('message') || '';
            const decodedMessage = decodeURIComponent(message);

            // Skip showing alerts for certain error types
            if (error === 'NO_REFRESH_TOKEN') {
                // Don't show error for partial success
                console.log('Calendar connected but no refresh token');
            } else if (error === 'NOT_AUTHENTICATED') {
                alert('Please log in first before connecting Google Calendar');
            } else if (error === 'NO_TOKENS') {
                alert('Google authorization failed. Please try again.');
            } else if (decodedMessage && decodedMessage !== 'Unknown error') {
                alert(`Error: ${decodedMessage}`);
            }

            // Clean up URL parameters
            router.replace('/dashboard/settings/profile', { scroll: false });
        }
    }, [success, error, searchParams, router]);

    // State change handlers
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

    // Handle Google Calendar connection
    const handleConnectCalendar = () => {
        window.location.href = '/api/auth/google';
    };

    const handleDisconnectCalendar = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { error } = await supabase
                    .from('profiles')
                    .update({
                        google_refresh_token: null
                    })
                    .eq('user_id', user.id);

                if (error) {
                    console.error('Error disconnecting calendar:', error);
                    alert('Failed to disconnect calendar');
                } else {
                    setIsCalendarConnected(false);
                    if (profile) {
                        setProfile({
                            ...profile,
                            google_refresh_token: null
                        });
                    }
                    alert('Google Calendar disconnected successfully');
                }
            }
        } catch (error) {
            console.error('Error disconnecting calendar:', error);
            alert('Failed to disconnect calendar');
        }
    };

    // Save changes
    const handleSaveChanges = async () => {
        if (!profileId || !profile) return;
        setSaving(true);
        setShowSuccess(false);

        const { error: profileError } = await supabase
            .from('profiles')
            .update({
                bio: profile.bio,
                specialties: profile.specialties,
                interests: profile.interests,
                hourly_rate: profile.hourly_rate,
                timezone: profile.timezone || detectedTimezone
            })
            .eq('id', profileId);

        if (profileError) {
            alert('Error saving profile: ' + profileError.message);
            setSaving(false);
            return;
        }

        const { error: deleteError } = await supabase.from('availability').delete().eq('professional_id', profileId);
        if (deleteError) {
            alert('Error clearing schedule: ' + deleteError.message);
            setSaving(false);
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
                setShowSuccess(true);
                setTimeout(() => setShowSuccess(false), 3000);
            }
        } else {
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 3000);
        }
        setSaving(false);
    };

    if (loading) return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-800 mx-auto mb-4"></div>
                <p className="text-gray-500">Loading Settings...</p>
            </div>
        </div>
    );

    return (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-800 mb-2">Settings</h1>
                <p className="text-gray-600">Manage your profile, availability, and integrations</p>
            </div>

            {/* Success Message for Calendar Connection */}
            {success === 'calendar_connected' && (
                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2 text-green-800">
                        <CheckCircle size={20} />
                        <span className="font-medium">Google Calendar connected successfully!</span>
                    </div>
                </div>
            )}

            {/* Navigation Tabs */}
            <div className="flex space-x-1 mb-8 bg-gray-100 p-1 rounded-lg">
                <button
                    onClick={() => setActiveSection('profile')}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md font-medium transition-colors ${
                        activeSection === 'profile'
                            ? 'bg-white text-gray-800 shadow-sm'
                            : 'text-gray-600 hover:text-gray-800'
                    }`}
                >
                    <User size={18} />
                    <span>Profile</span>
                </button>
                <button
                    onClick={() => setActiveSection('availability')}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md font-medium transition-colors ${
                        activeSection === 'availability'
                            ? 'bg-white text-gray-800 shadow-sm'
                            : 'text-gray-600 hover:text-gray-800'
                    }`}
                >
                    <Calendar size={18} />
                    <span>Availability</span>
                </button>
                <button
                    onClick={() => setActiveSection('integrations')}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md font-medium transition-colors ${
                        activeSection === 'integrations'
                            ? 'bg-white text-gray-800 shadow-sm'
                            : 'text-gray-600 hover:text-gray-800'
                    }`}
                >
                    <Sparkles size={18} />
                    <span>Integrations</span>
                </button>
            </div>

            {/* Profile Section */}
            {activeSection === 'profile' && (
                <div className="space-y-6">
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 md:p-8">
                        <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                            <User size={20} />
                            Profile Information
                        </h2>

                        <div className="grid gap-6 md:grid-cols-2">
                            {/* Bio - Full Width */}
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Bio</label>
                                <textarea
                                    value={profile?.bio || ''}
                                    onChange={(e) => handleProfileChange('bio', e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-gray-800 focus:border-transparent transition-all"
                                    rows={4}
                                    placeholder="Tell clients about yourself, your experience, and approach..."
                                />
                                <p className="text-xs text-gray-500 mt-1">A good bio helps clients connect with you</p>
                            </div>

                            {/* Specialties */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Specialties</label>
                                <input
                                    type="text"
                                    value={profile?.specialties?.join(', ') || ''}
                                    onChange={(e) => handleProfileChange('specialties', e.target.value.split(',').map(s => s.trim()))}
                                    className="w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-gray-800 focus:border-transparent transition-all"
                                    placeholder="e.g., Weight Loss, Sports Nutrition"
                                />
                                <p className="text-xs text-gray-500 mt-1">Separate with commas</p>
                            </div>

                            {/* Interests */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Interests</label>
                                <input
                                    type="text"
                                    value={profile?.interests?.join(', ') || ''}
                                    onChange={(e) => handleProfileChange('interests', e.target.value.split(',').map(s => s.trim()))}
                                    className="w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-gray-800 focus:border-transparent transition-all"
                                    placeholder="e.g., Bodybuilding, Meditation"
                                />
                                <p className="text-xs text-gray-500 mt-1">Separate with commas</p>
                            </div>

                            {/* Hourly Rate */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    <DollarSign size={16} className="inline mr-1" />
                                    Hourly Rate (₹)
                                </label>
                                <input
                                    type="number"
                                    value={profile?.hourly_rate || ''}
                                    onChange={(e) => handleProfileChange('hourly_rate', parseFloat(e.target.value) || null)}
                                    className="w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-gray-800 focus:border-transparent transition-all"
                                    placeholder="1500"
                                />
                                <p className="text-xs text-gray-500 mt-1">First consultation is always free</p>
                            </div>

                            {/* Timezone */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    <Globe size={16} className="inline mr-1" />
                                    Your Timezone
                                </label>
                                <select
                                    value={profile?.timezone || detectedTimezone}
                                    onChange={(e) => handleProfileChange('timezone', e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-gray-800 focus:border-transparent transition-all"
                                >
                                    {Object.entries(timezoneGroups).map(([region, zones]) => (
                                        <optgroup key={region} label={region}>
                                            {zones.map(tz => (
                                                <option key={tz.value} value={tz.value}>
                                                    {tz.label} ({tz.offset})
                                                </option>
                                            ))}
                                        </optgroup>
                                    ))}
                                </select>
                                <p className="text-xs text-gray-500 mt-1">
                                    Currently detected: {detectedTimezone}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Availability Section */}
            {activeSection === 'availability' && (
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 md:p-8">
                    <h2 className="text-xl font-semibold mb-2 flex items-center gap-2">
                        <Calendar size={20} />
                        Weekly Availability
                    </h2>
                    <p className="text-gray-600 mb-6">
                        Set your working hours in {profile?.timezone || detectedTimezone}. Clients will see these times converted to their timezone.
                    </p>

                    <div className="space-y-3">
                        {daysOfWeek.map((day, dayIndex) => {
                            const daySlot = availability.find(slot => slot.day_of_week === dayIndex);
                            const isEnabled = !!daySlot;
                            return (
                                <div key={day} className={`p-4 rounded-lg border transition-all ${
                                    isEnabled ? 'bg-gray-50 border-gray-300' : 'bg-white border-gray-200'
                                }`}>
                                    <div className="flex items-center justify-between flex-wrap gap-4">
                                        <div className="flex items-center">
                                            <input
                                                type="checkbox"
                                                checked={isEnabled}
                                                onChange={(e) => toggleDayAvailability(dayIndex, e.target.checked)}
                                                className="h-5 w-5 rounded border-gray-300 text-gray-800 focus:ring-gray-700 mr-3"
                                            />
                                            <span className={`font-medium ${isEnabled ? 'text-gray-800' : 'text-gray-500'}`}>
                                                {day}
                                            </span>
                                        </div>

                                        {isEnabled && (
                                            <div className="flex items-center gap-3">
                                                <div className="flex items-center gap-2">
                                                    <Clock size={16} className="text-gray-500" />
                                                    <select
                                                        value={daySlot?.start_time || '09:00'}
                                                        onChange={(e) => handleAvailabilityChange(dayIndex, 'start_time', e.target.value)}
                                                        className="bg-white border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-800"
                                                    >
                                                        {timeOptions.map(time => <option key={time} value={time}>{time}</option>)}
                                                    </select>
                                                </div>
                                                <span className="text-gray-500">to</span>
                                                <select
                                                    value={daySlot?.end_time || '17:00'}
                                                    onChange={(e) => handleAvailabilityChange(dayIndex, 'end_time', e.target.value)}
                                                    className="bg-white border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-800"
                                                >
                                                    {timeOptions.map(time => <option key={time} value={time}>{time}</option>)}
                                                </select>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-sm text-blue-800">
                            <AlertCircle size={16} className="inline mr-1" />
                            Tip: Keep your availability updated to help clients book at convenient times for both of you.
                        </p>
                    </div>
                </div>
            )}

            {/* Integrations Section */}
            {activeSection === 'integrations' && (
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 md:p-8">
                    <h2 className="text-xl font-semibold mb-2 flex items-center gap-2">
                        <Sparkles size={20} />
                        Integrations
                    </h2>
                    <p className="text-gray-600 mb-6">
                        Connect your favorite tools to enhance your coaching experience
                    </p>

                    <div className="space-y-4">
                        {/* Google Calendar Integration */}
                        <div className="p-6 border border-gray-200 rounded-lg">
                            <div className="flex items-start justify-between">
                                <div className="flex gap-4">
                                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                                        <Calendar className="text-blue-600" size={24} />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-gray-800">Google Calendar</h3>
                                        <p className="text-sm text-gray-600 mt-1">
                                            Automatically create Google Meet links for appointments
                                        </p>
                                        {isCalendarConnected && (
                                            <p className="text-xs text-green-600 mt-2">
                                                ✓ Connected - Calendar integration is active
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {isCalendarConnected ? (
                                    <div className="flex items-center gap-2">
                                        <div className="flex items-center gap-2 text-green-600 bg-green-50 px-3 py-1.5 rounded-full">
                                            <CheckCircle size={16} />
                                            <span className="text-sm font-medium">Connected</span>
                                        </div>
                                        <button
                                            onClick={handleDisconnectCalendar}
                                            className="text-red-600 hover:text-red-700 text-sm font-medium px-3 py-1.5 hover:bg-red-50 rounded-lg transition-colors"
                                        >
                                            Disconnect
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={handleConnectCalendar}
                                        className="bg-blue-600 text-white font-medium py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors text-sm"
                                    >
                                        Connect
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Coming Soon Integrations */}
                        <div className="p-6 border border-gray-200 rounded-lg opacity-60">
                            <div className="flex items-start justify-between">
                                <div className="flex gap-4">
                                    <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                                        <Calendar className="text-gray-400" size={24} />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-gray-800">Zoom</h3>
                                        <p className="text-sm text-gray-600 mt-1">
                                            Create Zoom meetings for appointments
                                        </p>
                                    </div>
                                </div>
                                <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1.5 rounded-full">
                                    Coming Soon
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Save Button - Fixed at bottom */}
            <div className="sticky bottom-0 bg-gradient-to-t from-gray-50 to-transparent pt-8 pb-4 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
                <div className="flex items-center justify-between max-w-6xl mx-auto">
                    <div>
                        {showSuccess && (
                            <div className="flex items-center gap-2 text-green-600">
                                <Check size={20} />
                                <span className="font-medium">Changes saved successfully!</span>
                            </div>
                        )}
                    </div>
                    <button
                        onClick={handleSaveChanges}
                        disabled={saving}
                        className="bg-gray-800 text-white font-bold py-3 px-6 rounded-lg hover:bg-gray-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                    >
                        {saving ? (
                            <>
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                Saving...
                            </>
                        ) : (
                            <>
                                <Save size={20} />
                                Save Changes
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

// Loading component for Suspense fallback
function SettingsLoading() {
    return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-800 mx-auto mb-4"></div>
                <p className="text-gray-500">Loading Settings...</p>
            </div>
        </div>
    );
}

// Main component with Suspense wrapper
export default function ProfileSettingsPage() {
    return (
        <Suspense fallback={<SettingsLoading />}>
            <ProfileSettingsContent />
        </Suspense>
    );
}