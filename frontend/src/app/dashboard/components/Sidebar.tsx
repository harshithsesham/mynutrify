'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { LayoutDashboard, User, Calendar, Search, Settings, LogOut } from 'lucide-react';

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
        <aside className="w-64 bg-gray-800 p-6 flex flex-col">
            <h1 className="text-3xl font-bold text-green-400 mb-12">Nutrify</h1>
            <nav className="flex-grow">
                <ul>
                    {navLinks.map((link) => {
                        const isActive = pathname === link.href;
                        return (
                            <li key={link.name} className="mb-4">
                                <Link
                                    href={link.href}
                                    className={`flex items-center p-3 rounded-lg transition-colors ${
                                        isActive
                                            ? 'bg-green-500 text-white'
                                            : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                                    }`}
                                >
                                    <link.icon className="mr-4" size={20} />
                                    {link.name}
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            </nav>
            <div>
                <button
                    onClick={handleLogout}
                    className="flex items-center w-full p-3 rounded-lg text-gray-300 hover:bg-red-500/20 hover:text-red-400 transition-colors"
                >
                    <LogOut className="mr-4" size={20} />
                    Logout
                </button>
            </div>
        </aside>
    );
}
