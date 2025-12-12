// app/dashboard/settings/profile/page.tsx
'use client';

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useCallback, useEffect, useState, Suspense } from 'react';
import {
    CheckCircle,
    Globe,
    User,
    Calendar,
    DollarSign,
    Sparkles,
    Clock,
    Save,
    AlertCircle,
    Check,
    Info,
    Loader2,
    Minus
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

// Type definitions
type Profile = {
    full_name: string;
    role: string; // Added role here for component logic
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
    const [currentTime, setCurrentTime] = useState(new Date());

    // Update current time every minute
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    // Get current time in selected timezone
    const getTimeInTimezone = (timezone: string) => {
        try {
            const zonedTime = toZonedTime(currentTime, timezone);
            return format(zonedTime, 'h:mm a');
        } catch {
            return format(currentTime, 'h:mm a');
        }
    };

    // Format time for display (add AM/PM indicators)
    const formatTimeOption = (time: string) => {
        const [hour, minute] = time.split(':').map(Number);
        const period = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
        return `${displayHour}:${minute.toString().padStart(2, '0')} ${period}`;
    };

    // Check for URL parameters from OAuth callback
    const success = searchParams.get('success');
    const error = searchParams.get('error');
    const shouldRefresh = searchParams.get('refresh');

    // Fetches all necessary data
    const getProfileData = useCallback(async (userId: string) => {
        setLoading(true);
        const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('id, full_name, role, bio, specialties, interests, hourly_rate, google_refresh_token, timezone')
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

            const hasToken = !!profileData.google_refresh_token;
            setIsCalendarConnected(hasToken);

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
            router.replace('/dashboard/settings/profile', { scroll: false });
        } else if (error) {
            const message = searchParams.get('message') || '';
            const decodedMessage = decodeURIComponent(message);

            if (decodedMessage && decodedMessage !== 'Unknown error') {
                alert(`Error: ${decodedMessage}`);
            }

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
            alert('Failed to disconnect calendar');
        }
    };

    // Save changes
    const handleSaveChanges = async () => {
        if (!profileId || !profile) return;
        setSaving(true);
        setShowSuccess(false);

        // 1. Validate times: ensure start < end for all slots
        const invalidSlots = availability.filter(slot => {
            return slot.start_time >= slot.end_time;
        });

        if (invalidSlots.length > 0) {
            alert('Validation Error: Start time must be before end time for all enabled slots.');
            setSaving(false);
            return;
        }


        // 2. Update Profile
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

        // 3. Update Availability (Delete all, then insert current list)
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
        <div className="flex items-center justify-center min-h-[400px] w-full">
            <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
                <p className="text-gray-500">Loading Settings...</p>
            </div>
        </div>
    );

    const isProfessional = profile?.role !== 'client'; // Assume anyone not explicitly a client might use pro settings

    return (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-4xl font-extrabold text-gray-900 mb-2">My Settings</h1>
                <p className="text-lg text-gray-600">Manage your profile, availability, and integrations</p>
            </div>

            {/* Success/Error Message */}
            {success === 'calendar_connected' && (
                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl shadow-sm">
                    <div className="flex items-center gap-2 text-green-800 font-medium">
                        <CheckCircle size={20} className="text-green-600" />
                        <span>Google Calendar connected successfully!</span>
                    </div>
                </div>
            )}

            {/* Navigation Tabs - Redesigned */}
            <div className="flex space-x-1 mb-8 bg-gray-100 p-1 rounded-full shadow-inner">
                <button
                    onClick={() => setActiveSection('profile')}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-full font-bold transition-all duration-200 ${
                        activeSection === 'profile'
                            ? 'bg-teal-600 text-white shadow-md'
                            : 'text-gray-700 hover:bg-gray-200'
                    }`}
                >
                    <User size={18} />
                    <span>Profile</span>
                </button>
                {isProfessional && (
                    <button
                        onClick={() => setActiveSection('availability')}
                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-full font-bold transition-all duration-200 ${
                            activeSection === 'availability'
                                ? 'bg-teal-600 text-white shadow-md'
                                : 'text-gray-700 hover:bg-gray-200'
                        }`}
                    >
                        <Calendar size={18} />
                        <span>Availability</span>
                    </button>
                )}
                {isProfessional && (
                    <button
                        onClick={() => setActiveSection('integrations')}
                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-full font-bold transition-all duration-200 ${
                            activeSection === 'integrations'
                                ? 'bg-teal-600 text-white shadow-md'
                                : 'text-gray-700 hover:bg-gray-200'
                        }`}
                    >
                        <Sparkles size={18} />
                        <span>Integrations</span>
                    </button>
                )}
            </div>

            {/* Profile Section */}
            {activeSection === 'profile' && (
                <div className="space-y-6">
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-xl p-6 md:p-8">
                        <h2 className="text-2xl font-bold mb-6 flex items-center gap-3 text-teal-600">
                            <User size={24} />
                            Profile Information
                        </h2>

                        <div className="grid gap-6 md:grid-cols-2">
                            {/* Full Name (Read-only) */}
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                                <input
                                    type="text"
                                    value={profile?.full_name || ''}
                                    disabled
                                    className="w-full bg-gray-100 border border-gray-300 rounded-xl px-4 py-3 text-gray-500 cursor-not-allowed"
                                />
                            </div>

                            {/* Bio - Full Width */}
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Bio</label>
                                <textarea
                                    value={profile?.bio || ''}
                                    onChange={(e) => handleProfileChange('bio', e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-shadow resize-none"
                                    rows={4}
                                    placeholder="Tell clients about yourself, your experience, and approach..."
                                />
                                <p className="text-xs text-gray-500 mt-1">A good bio helps clients connect with you</p>
                            </div>

                            {/* Specialties */}
                            {isProfessional && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Specialties</label>
                                    <input
                                        type="text"
                                        value={profile?.specialties?.join(', ') || ''}
                                        onChange={(e) => handleProfileChange('specialties', e.target.value.split(',').map(s => s.trim()))}
                                        className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-shadow"
                                        placeholder="e.g., Weight Loss, Sports Nutrition"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Separate with commas</p>
                                </div>
                            )}

                            {/* Interests */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Interests</label>
                                <input
                                    type="text"
                                    value={profile?.interests?.join(', ') || ''}
                                    onChange={(e) => handleProfileChange('interests', e.target.value.split(',').map(s => s.trim()))}
                                    className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-shadow"
                                    placeholder="e.g., Bodybuilding, Meditation"
                                />
                                <p className="text-xs text-gray-500 mt-1">Separate with commas</p>
                            </div>

                            {/* Hourly Rate */}
                            {isProfessional && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        <DollarSign size={16} className="inline mr-1 text-teal-600" />
                                        Hourly Rate (₹)
                                    </label>
                                    <input
                                        type="number"
                                        value={profile?.hourly_rate || ''}
                                        onChange={(e) => handleProfileChange('hourly_rate', parseFloat(e.target.value) || null)}
                                        className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-shadow"
                                        placeholder="1500"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">First consultation is always free</p>
                                </div>
                            )}

                            {/* Timezone */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    <Globe size={16} className="inline mr-1 text-teal-600" />
                                    Your Timezone
                                </label>
                                <select
                                    value={profile?.timezone || detectedTimezone}
                                    onChange={(e) => handleProfileChange('timezone', e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-shadow"
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
            {activeSection === 'availability' && isProfessional && (
                <div className="bg-white rounded-2xl border border-gray-200 shadow-xl p-6 md:p-8">
                    <h2 className="text-2xl font-bold mb-2 flex items-center gap-3 text-teal-600">
                        <Calendar size={24} />
                        Weekly Availability
                    </h2>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 border-b pb-4">
                        <p className="text-gray-600">
                            Set your working hours in: <strong>{profile?.timezone || detectedTimezone}</strong>
                        </p>
                        <p className="text-sm text-gray-500 flex items-center gap-1 mt-2 sm:mt-0">
                            <Clock size={16} className="text-teal-500" />
                            Local time: <strong>{getTimeInTimezone(profile?.timezone || detectedTimezone)}</strong>
                        </p>
                    </div>
                    <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 mb-6">
                        <p className="text-sm text-teal-800 flex items-start gap-2">
                            <Info size={16} className="flex-shrink-0 mt-0.5" />
                            Clients will see these times converted to their local timezone. Ensure your timezone is correct in the Profile tab.
                        </p>
                    </div>

                    <div className="space-y-4">
                        {daysOfWeek.map((day, dayIndex) => {
                            const daySlot = availability.find(slot => slot.day_of_week === dayIndex);
                            const isEnabled = !!daySlot;
                            return (
                                <div key={day} className={`p-4 rounded-xl border transition-all ${
                                    isEnabled ? 'bg-teal-50 border-teal-300' : 'bg-white border-gray-200 hover:bg-gray-50'
                                }`}>
                                    <div className="flex items-center justify-between flex-wrap gap-4">
                                        <div className="flex items-center">
                                            <input
                                                type="checkbox"
                                                checked={isEnabled}
                                                onChange={(e) => toggleDayAvailability(dayIndex, e.target.checked)}
                                                className="h-5 w-5 rounded border-gray-300 text-teal-600 focus:ring-teal-500 mr-3"
                                            />
                                            <span className={`font-bold ${isEnabled ? 'text-teal-800' : 'text-gray-600'}`}>
                                                {day}
                                            </span>
                                        </div>

                                        {isEnabled ? (
                                            <div className="flex items-center gap-3">
                                                <div className="flex items-center gap-2">
                                                    <select
                                                        value={daySlot?.start_time || '09:00'}
                                                        onChange={(e) => handleAvailabilityChange(dayIndex, 'start_time', e.target.value)}
                                                        className="bg-white border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-teal-500 focus:border-teal-500"
                                                    >
                                                        {timeOptions.map(time => (
                                                            <option key={time} value={time}>
                                                                {formatTimeOption(time)}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <span className="text-gray-500 font-bold">to</span>
                                                <select
                                                    value={daySlot?.end_time || '17:00'}
                                                    onChange={(e) => handleAvailabilityChange(dayIndex, 'end_time', e.target.value)}
                                                    className="bg-white border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-teal-500 focus:border-teal-500"
                                                >
                                                    {timeOptions.map(time => (
                                                        <option key={time} value={time}>
                                                            {formatTimeOption(time)}
                                                        </option>
                                                    ))}
                                                </select>
                                                <button
                                                    onClick={() => toggleDayAvailability(dayIndex, false)}
                                                    className="p-1.5 text-red-600 hover:bg-red-50 rounded-full transition-colors"
                                                    title="Remove Slot"
                                                >
                                                    <Minus size={18} />
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => toggleDayAvailability(dayIndex, true)}
                                                className="text-teal-600 hover:text-teal-700 text-sm font-bold px-4 py-2 hover:bg-teal-50 rounded-full transition-colors"
                                            >
                                                + Add Full Day Slot
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                        <p className="text-sm text-yellow-800 flex items-center gap-2">
                            <AlertCircle size={16} className="flex-shrink-0" />
                            <strong>Warning:</strong> Ensure end time is later than start time for all slots before saving.
                        </p>
                    </div>
                </div>
            )}

            {/* Integrations Section */}
            {activeSection === 'integrations' && isProfessional && (
                <div className="bg-white rounded-2xl border border-gray-200 shadow-xl p-6 md:p-8">
                    <h2 className="text-2xl font-bold mb-2 flex items-center gap-3 text-teal-600">
                        <Sparkles size={24} />
                        Integrations
                    </h2>
                    <p className="text-gray-600 mb-6 border-b pb-4">
                        Connect your favorite tools to automate scheduling and communication.
                    </p>

                    <div className="space-y-6">
                        {/* Google Calendar Integration */}
                        <div className="p-6 border border-gray-200 rounded-xl shadow-md">
                            <div className="flex items-start justify-between">
                                <div className="flex gap-4">
                                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                                        <Calendar className="text-blue-600" size={24} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-900">Google Calendar</h3>
                                        <p className="text-sm text-gray-600 mt-1">
                                            Automatically create Google Meet links and sync appointments.
                                        </p>
                                    </div>
                                </div>

                                {isCalendarConnected ? (
                                    <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2">
                                        <div className="flex items-center gap-2 text-green-600 bg-green-50 px-3 py-1.5 rounded-full">
                                            <Check size={14} />
                                            <span className="text-sm font-medium">Connected</span>
                                        </div>
                                        <button
                                            onClick={handleDisconnectCalendar}
                                            className="text-red-600 hover:text-red-700 text-sm font-medium px-4 py-2 hover:bg-red-50 rounded-full transition-colors border border-red-200"
                                        >
                                            Disconnect
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={handleConnectCalendar}
                                        className="bg-blue-600 text-white font-bold py-2.5 px-6 rounded-full hover:bg-blue-700 transition-colors text-sm shadow-md"
                                    >
                                        Connect Google
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Coming Soon Integrations */}
                        <div className="p-6 border border-gray-200 rounded-xl shadow-sm opacity-60">
                            <div className="flex items-start justify-between">
                                <div className="flex gap-4">
                                    <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
                                        <Calendar className="text-gray-400" size={24} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-800">Zoom</h3>
                                        <p className="text-sm text-gray-600 mt-1">
                                            Create Zoom meetings for appointments.
                                        </p>
                                    </div>
                                </div>
                                <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1.5 rounded-full font-medium">
                                    Coming Soon
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Save Button - Fixed at bottom */}
            <div className="sticky bottom-0 bg-gradient-to-t from-gray-50/90 to-transparent pt-8 pb-4 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 z-20">
                <div className="flex items-center justify-between max-w-6xl mx-auto p-4 bg-white rounded-full shadow-2xl border border-gray-200">
                    <div>
                        {showSuccess && (
                            <div className="flex items-center gap-2 text-green-600 font-bold">
                                <Check size={20} />
                                <span className="font-medium">Changes saved successfully!</span>
                            </div>
                        )}
                    </div>
                    <button
                        onClick={handleSaveChanges}
                        disabled={saving}
                        className="bg-teal-600 text-white font-bold py-3 px-6 rounded-full hover:bg-teal-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center gap-2 shadow-lg"
                    >
                        {saving ? (
                            <>
                                <Loader2 size={20} className="animate-spin" />
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
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
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