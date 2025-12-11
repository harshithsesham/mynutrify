// frontend/src/app/dashboard/layout.tsx
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
        // Changed bg-gray-50 to a subtle bg-white/gray for a cleaner base
        <div className="bg-gray-50 min-h-screen flex">
            {/* Sidebar for mobile and desktop */}
            <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />

            {/* Main content area */}
            <div className="flex-1 md:ml-64">
                {/* Header now includes the mobile menu button */}
                <Header onMenuClick={() => setSidebarOpen(true)} />
                {/* Increased horizontal padding for a more spacious feel */}
                <main className="p-4 sm:p-8">
                    {children}
                </main>
            </div>
        </div>
    );
}