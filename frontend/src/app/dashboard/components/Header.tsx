// app/dashboard/components/Header.tsx
'use client';
import { Bell, UserCircle } from 'lucide-react';

export default function Header() {
    return (
        <header className="bg-white border-b border-gray-200 h-20 flex items-center justify-end px-8">
            <div className="flex items-center gap-6">
                <button className="text-gray-500 hover:text-gray-800">
                    <Bell size={24} />
                </button>
                <div className="flex items-center gap-3">
                    <UserCircle size={32} className="text-gray-400" />
                    <div>
                        {/* This can be made dynamic later */}
                        <p className="font-semibold text-gray-800">Harshith Sesham</p>
                        <p className="text-sm text-gray-500">Nutritionist</p>
                    </div>
                </div>
            </div>
        </header>
    );
}
