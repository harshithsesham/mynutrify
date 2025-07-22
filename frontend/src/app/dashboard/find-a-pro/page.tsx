// app/dashboard/find-a-pro/page.tsx
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Star } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

type ProfessionalProfile = {
    id: string;
    full_name: string;
    bio: string | null;
    specialties: string[] | null;
    role: 'nutritionist' | 'trainer';
};

export default async function FindAProPage() {
    const supabase = createServerComponentClient({ cookies });

    const { data: professionals, error } = await supabase
        .from('profiles')
        .select('id, full_name, bio, specialties, role')
        .in('role', ['nutritionist', 'trainer']);

    if (error) {
        console.error('Error fetching professionals:', error);
        return <div className="text-red-500 p-8">Error loading professionals.</div>;
    }

    return (
        <div className="max-w-7xl mx-auto text-gray-800">
            <div className="text-center mb-12">
                <h1 className="text-5xl font-bold mb-2">Find Your Coach</h1>
                <p className="text-lg text-gray-600">Get guidance from India's top certified fitness coaches.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                {professionals && professionals.length > 0 ? (
                    professionals.map((pro: ProfessionalProfile) => (
                        <Link href={`/dashboard/professionals/${pro.id}`} key={pro.id} className="block bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden group transform hover:-translate-y-1 transition-all duration-300">
                            <div className="h-48 bg-gray-200 flex items-center justify-center">
                                <span className="text-gray-500">Coach Image</span>
                            </div>
                            <div className="p-4">
                                <h2 className="text-xl font-bold text-gray-800 truncate">{pro.full_name}</h2>
                                <p className="text-md capitalize text-gray-600 mb-2">{pro.role}</p>
                                <div className="flex items-center gap-1 text-yellow-400 mb-4">
                                    <Star size={16} fill="currentColor" />
                                    <Star size={16} fill="currentColor" />
                                    <Star size={16} fill="currentColor" />
                                    <Star size={16} fill="currentColor" />
                                    <Star size={16} className="text-gray-300" fill="currentColor"/>
                                    <span className="text-sm text-gray-500 ml-1">(123)</span>
                                </div>
                                <div className="mt-auto">
                                    <div className="w-full bg-gray-800 group-hover:bg-gray-700 text-white text-center font-bold py-3 px-4 rounded-lg transition duration-300">
                                        View Profile
                                    </div>
                                </div>
                            </div>
                        </Link>
                    ))
                ) : (
                    <p className="text-gray-500 col-span-full text-center">No professionals found.</p>
                )}
            </div>
        </div>
    );
}
