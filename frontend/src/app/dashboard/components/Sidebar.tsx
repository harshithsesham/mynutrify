// app/dashboard/components/Sidebar.tsx (Updated section for health coach)
'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import {
    LayoutDashboard,
    Calendar,
    Search,
    Settings,
    LogOut,
    Users,
    FileText,
    X,
    HeartHandshake,
    UserCheck,
    ClipboardList,
    BarChart,
    MessageSquare,
    UserPlus
} from 'lucide-react';
import { useEffect, useState } from 'react';

interface SidebarProps {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
}

export default function Sidebar({ isOpen, setIsOpen }: SidebarProps) {
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
                if (profile) setUserRole(profile.role);
            }
        };
        fetchUserRole();
    }, [supabase]);

    const getNavLinks = () => {
        const baseLinks = [
            { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard }
        ];

        switch (userRole) {
            case 'client':
                return [
                    ...baseLinks,
                    { name: 'My Nutritionist', href: '/dashboard/my-nutritionist', icon: UserCheck },
                    { name: 'My Appointments', href: '/dashboard/my-appointments', icon: Calendar },
                    { name: 'My Plans', href: '/dashboard/my-plans', icon: FileText },
                    { name: 'Messages', href: '/dashboard/messages', icon: MessageSquare },
                    { name: 'Settings', href: '/dashboard/settings/profile', icon: Settings }
                ];

            case 'nutritionist':
                return [
                    ...baseLinks,
                    { name: 'Assigned Clients', href: '/dashboard/nutritionist/assigned-clients', icon: Users },
                    { name: 'My Clients', href: '/dashboard/my-clients', icon: Users },
                    { name: 'Calendar', href: '/dashboard/my-appointments', icon: Calendar },
                    { name: 'Messages', href: '/dashboard/messages', icon: MessageSquare },
                    { name: 'Settings', href: '/dashboard/settings/profile', icon: Settings }
                ];

            case 'health_coach':
                return [
                    ...baseLinks,
                    { name: 'Consultation Requests', href: '/dashboard/health-coach/consultation-requests', icon: ClipboardList },
                    { name: 'Assign Nutritionists', href: '/dashboard/health-coach/assign-nutritionists', icon: UserCheck },
                    { name: 'Analytics', href: '/dashboard/health-coach/analytics', icon: BarChart },
                    { name: 'Messages', href: '/dashboard/messages', icon: MessageSquare },
                    { name: 'Settings', href: '/dashboard/settings/profile', icon: Settings }
                ];

            case 'trainer':
                return [
                    ...baseLinks,
                    { name: 'My Clients', href: '/dashboard/my-clients', icon: Users },
                    { name: 'My Appointments', href: '/dashboard/my-appointments', icon: Calendar },
                    { name: 'Messages', href: '/dashboard/messages', icon: MessageSquare },
                    { name: 'Settings', href: '/dashboard/settings/profile', icon: Settings }
                ];

            default:
                return baseLinks;
        }
    };

    const navLinks = getNavLinks();

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push('/login');
        router.refresh();
    };

    const SidebarContent = () => (
        <>
            <div className="flex justify-between items-center mb-12">
                <h1 className="text-3xl font-bold text-gray-800">NutriShiksha</h1>
                <button onClick={() => setIsOpen(false)} className="md:hidden text-gray-500 hover:text-gray-800">
                    <X size={28} />
                </button>
            </div>
            <nav className="flex-grow">
                <ul>
                    {navLinks.map((link) => {
                        const isActive = link.href === '/dashboard'
                            ? pathname === link.href
                            : pathname.startsWith(link.href);
                        return (
                            <li key={link.name} className="mb-3">
                                <Link
                                    href={link.href}
                                    onClick={() => setIsOpen(false)}
                                    className={`flex items-center p-3 rounded-lg transition-colors text-gray-600 font-medium ${
                                        isActive ? 'bg-gray-800 text-white' : 'hover:bg-gray-100'
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
        </>
    );

    return (
        <>
            {/* Mobile Sidebar (Overlay) */}
            <div className={`fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden transition-opacity ${
                isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`} onClick={() => setIsOpen(false)}></div>
            <aside className={`fixed top-0 left-0 h-full w-64 bg-white border-r border-gray-200 p-6 flex flex-col z-40 transform transition-transform md:translate-x-0 ${
                isOpen ? 'translate-x-0' : '-translate-x-full'
            }`}>
                <SidebarContent />
            </aside>

            {/* Desktop Sidebar (Static) */}
            <aside className="w-64 bg-white border-r border-gray-200 p-6 flex-col fixed h-full hidden md:flex">
                <SidebarContent />
            </aside>
        </>
    );
}