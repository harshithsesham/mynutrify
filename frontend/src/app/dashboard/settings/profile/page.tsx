// app/dashboard/settings/profile/page.tsx
'use client';

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useCallback, useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';

// ... (type definitions for Profile and Availability would go here)

export default function ProfileSettingsPage() {
    // ... (state and data fetching logic would go here)

    return (
        <div className="max-w-5xl mx-auto text-gray-800">
            <h1 className="text-3xl font-bold mb-8">Settings</h1>

            {/* Redesigned Availability Section */}
            <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm">
                <h2 className="text-2xl font-semibold mb-2">Set Your Weekly Availability</h2>
                <p className="text-gray-500 mb-6">Define your standard working hours for each day.</p>

                {/* Availability Form would go here, with a much cleaner UI */}
                <div className="space-y-4">
                    {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
                        <div key={day} className="grid grid-cols-3 items-center gap-4 p-4 border-b border-gray-200">
                            <span className="font-medium">{day}</span>
                            <div className="col-span-2 flex items-center gap-4">
                                <select className="bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 w-full">
                                    <option>09:00 AM</option>
                                    <option>10:00 AM</option>
                                    {/* ... more options */}
                                </select>
                                <span>-</span>
                                <select className="bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 w-full">
                                    <option>05:00 PM</option>
                                    <option>06:00 PM</option>
                                    {/* ... more options */}
                                </select>
                                <button className="text-gray-400 hover:text-red-500"><Trash2 size={20}/></button>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="mt-6 flex justify-end">
                    <button className="bg-gray-800 text-white font-bold py-3 px-6 rounded-lg hover:bg-gray-700">
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
}
