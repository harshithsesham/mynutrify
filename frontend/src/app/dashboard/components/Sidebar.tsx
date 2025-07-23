// app/dashboard/components/Sidebar.tsx
'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { LayoutDashboard, Calendar, Search, Settings, LogOut, Users, FileText } from 'lucide-react';
import { useEffect, useState } from 'react';

const baseNavLinks = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Find a Coach', href: '/dashboard/find-a-pro', icon: Search },
    { name: 'My Appointments', href: '/dashboard/my-appointments', icon: Calendar },
];

const clientLinks = [
    { name: 'My Plans', href: '/dashboard/my-plans', icon: FileText },
];

const coachLinks = [
    { name: 'My Clients', href: '/dashboard/my-clients', icon: Users },
];

const settingsLink = { name: 'Settings', href: '/dashboard/settings/profile', icon: Settings };

export default function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const supabase = createClientComponentClient();
    const [userRole, setUserRole] = useState<string | null>(null);

    useEffect(() => {
        const fetchUserRole = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('user_id', user.id)
                    .single();
                if (profile) {
                    setUserRole(profile.role);
                }
            }
        };
        fetchUserRole();
    }, [supabase]);

    const navLinks = [
        ...baseNavLinks,
        ...(userRole === 'client' ? clientLinks : []),
        ...(userRole === 'nutritionist' || userRole === 'trainer' ? coachLinks : []),
        settingsLink,
    ];

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push('/login');
        router.refresh();
    };

    return (
        <aside className="w-64 bg-white border-r border-gray-200 p-6 flex-col fixed h-full">
            <h1 className="text-3xl font-bold text-gray-800 mb-12">Nutrify</h1>
            <nav className="flex-grow">
                <ul>
                    {navLinks.map((link) => {
                        // This is the corrected logic. It checks for an exact match for the dashboard
                        // and a partial match for all other pages.
                        const isActive = link.href === '/dashboard'
                            ? pathname === link.href
                            : pathname.startsWith(link.href);

                        return (
                            <li key={link.name} className="mb-3">
                                <Link
                                    href={link.href}
                                    className={`flex items-center p-3 rounded-lg transition-colors text-gray-600 font-medium ${
                                        isActive
                                            ? 'bg-gray-800 text-white'
                                            : 'hover:bg-gray-100'
                                    }`}
                                >
                                    <link.icon className="mr-4" size={20} />
                                    <span>{link.name}</span>
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            </nav>
            <div className="mt-auto">
                <button
                    onClick={handleLogout}
                    className="flex items-center w-full p-3 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
                >
                    <LogOut className="mr-4" size={20} />
                    <span>Logout</span>
                </button>
            </div>
        </aside>
    );
}
