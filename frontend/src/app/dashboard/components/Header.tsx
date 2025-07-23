// app/dashboard/components/Header.tsx
'use client';
import { Bell, UserCircle } from 'lucide-react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useEffect, useState } from 'react';

type Profile = {
    full_name: string;
    role: string;
};

export default function Header() {
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
        <header className="bg-white border-b border-gray-200 h-20 flex items-center justify-end px-8">
            <div className="flex items-center gap-6">
                <button className="text-gray-500 hover:text-gray-800">
                    <Bell size={24} />
                </button>
                <div className="flex items-center gap-3">
                    <UserCircle size={32} className="text-gray-400" />
                    <div>
                        <p className="font-semibold text-gray-800">{profile?.full_name || 'User'}</p>
                        <p className="text-sm text-gray-500 capitalize">{profile?.role || 'Role'}</p>
                    </div>
                </div>
            </div>
        </header>
    );
}
