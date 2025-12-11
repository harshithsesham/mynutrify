// frontend/src/app/dashboard/components/Header.tsx
'use client';

import { Bell, UserCircle, Menu } from 'lucide-react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useEffect, useState } from 'react';

type Profile = {
    full_name: string;
    role: string;
};

interface HeaderProps {
    onMenuClick: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
    const supabase = createClientComponentClient();
    const [profile, setProfile] = useState<Profile | null>(null);

    useEffect(() => {
        const fetchProfile = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profileData } = await supabase
                    .from('profiles')
                    .select('full_name, role')
                    .eq('user_id', user.id)
                    .single();
                if (profileData) {
                    setProfile(profileData);
                }
            }
        };
        fetchProfile();
    }, [supabase]);

    return (
        // Added shadow-lg for a more premium, lifted look
        <header className="bg-white shadow-md h-20 flex items-center justify-between md:justify-end px-4 sm:px-8 z-30">
            {/* Hamburger Menu Button - Only visible on mobile */}
            <button
                onClick={onMenuClick}
                className="md:hidden text-gray-500 hover:text-teal-600 p-2 rounded-lg transition-colors"
            >
                <Menu size={28} />
            </button>

            <div className="flex items-center gap-6">
                <button
                    title="Notifications"
                    className="text-gray-500 hover:text-teal-600 p-2 rounded-full hover:bg-gray-100 transition-colors"
                >
                    <Bell size={24} />
                </button>
                <div className="flex items-center gap-3">
                    {/* User profile icon in a subtle color */}
                    <UserCircle size={36} className="text-gray-400" />
                    <div>
                        <p className="font-semibold text-gray-800">{profile?.full_name || 'User'}</p>
                        {/* User role highlighted with the accent color */}
                        <p className="text-sm text-teal-600 capitalize">{profile?.role || 'Role'}</p>
                    </div>
                </div>
            </div>
        </header>
    );
}