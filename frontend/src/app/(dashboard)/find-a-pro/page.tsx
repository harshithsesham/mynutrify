// app/(dashboard)/find-a-pro/page.tsx
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Award, Link as LinkIcon } from 'lucide-react';
import Link from 'next/link';

// This line tells Next.js to render this page dynamically at request time
export const dynamic = 'force-dynamic';

type ProfessionalProfile = {
    id: string;
    full_name: string;
    bio: string | null;
    specialties: string[] | null;
    hourly_rate: number | null;
    role: 'nutritionist' | 'trainer';
};

export default async function FindAProPage() {
    const supabase = createServerComponentClient({ cookies });

    const { data: professionals, error } = await supabase
        .from('profiles')
        .select('id, full_name, bio, specialties, hourly_rate, role')
        .in('role', ['nutritionist', 'trainer']);

    if (error) {
        console.error('Error fetching professionals:', error);
        return <div className="text-red-400 p-8">Error loading professionals. Please try again later.</div>;
    }

    return (
        <div className="max-w-7xl mx-auto p-4 sm:p-8 text-white">
            <h1 className="text-4xl font-bold mb-2">Find a Professional</h1>
            <p className="text-lg text-gray-400 mb-8">Browse our directory of expert nutritionists and trainers.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {professionals && professionals.length > 0 ? (
                    professionals.map((pro: ProfessionalProfile) => (
                        <div key={pro.id} className="bg-gray-800 rounded-2xl shadow-lg p-6 flex flex-col hover:shadow-green-400/20 hover:border-green-500/30 border border-transparent transition-all duration-300">
                            <div className="flex-grow">
                                <div className="flex items-start justify-between mb-4">
                                    <div>
                                        <h2 className="text-2xl font-bold text-white">{pro.full_name}</h2>
                                        <p className="text-md capitalize text-green-400">{pro.role}</p>
                                    </div>
                                    {pro.hourly_rate && (
                                        <div className="flex items-center text-lg font-semibold bg-gray-700 px-3 py-1 rounded-full">
                                            <span className="font-bold text-green-400 mr-1">₹</span>
                                            {pro.hourly_rate}
                                            <span className="text-sm text-gray-400">/hr</span>
                                        </div>
                                    )}
                                </div>
                                <p className="text-gray-300 mb-4 h-24 overflow-hidden text-ellipsis">
                                    {pro.bio || 'No bio provided.'}
                                </p>
                                {pro.specialties && pro.specialties.length > 0 && (
                                    <div className="mb-4">
                                        <h3 className="font-semibold mb-2 flex items-center"><Award size={18} className="mr-2 text-green-400"/> Specialties</h3>
                                        <div className="flex flex-wrap gap-2">
                                            {pro.specialties.map(spec => (
                                                <span key={spec} className="bg-gray-700 text-gray-200 text-sm px-3 py-1 rounded-full">
                          {spec}
                        </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="mt-auto pt-4">
                                <Link href={`/professionals/${pro.id}`} passHref>
                                    <button className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-4 rounded-lg transition duration-300 flex items-center justify-center">
                                        <LinkIcon size={18} className="mr-2"/> View Profile & Book
                                    </button>
                                </Link>
                            </div>
                        </div>
                    ))
                ) : (
                    <p className="text-gray-400 col-span-full text-center">No professionals found.</p>
                )}
            </div>
        </div>
    );
}