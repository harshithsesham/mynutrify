// app/dashboard/layout.tsx
'use client';

import { useState } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';

export default function DashboardLayout({
                                            children,
                                        }: {
    children: React.ReactNode;
}) {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    return (
        <div className="bg-gray-50 min-h-screen flex">
            {/* Sidebar for mobile and desktop */}
            <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />

            {/* Main content area */}
            <div className="flex-1 md:ml-64">
                {/* Header now includes the mobile menu button */}
                <Header onMenuClick={() => setSidebarOpen(true)} />
                <main className="p-4 sm:p-8">
                    {children}
                </main>
            </div>
        </div>
    );
}
