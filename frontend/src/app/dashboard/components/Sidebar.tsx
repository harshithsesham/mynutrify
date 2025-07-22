// app/dashboard/components/Sidebar.tsx
'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { LayoutDashboard, Calendar, Search, Settings, LogOut } from 'lucide-react';

// Note: All hrefs now include the /dashboard/ prefix
const navLinks = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Find a Coach', href: '/dashboard/find-a-pro', icon: Search },
    { name: 'My Appointments', href: '/dashboard/my-appointments', icon: Calendar },
    { name: 'Settings', href: '/dashboard/settings/profile', icon: Settings },
];

export default function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const supabase = createClientComponentClient();

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
                        const isActive = pathname === link.href;
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