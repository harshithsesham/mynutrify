// app/dashboard/professionals/[id]/page.tsx
import ProfessionalProfileClient from './ProfessionalProfileClient';
import React from 'react';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

// Define the props type to match what the build process expects,
// which is a Promise containing the params.
type PageProps = {
    params: Promise<{ id: string }>;
};

// Make the component async and await the params to resolve the Promise.
// This directly addresses the build error.
export default async function Page({ params }: PageProps): Promise<React.ReactElement> {
    const resolvedParams = await params;
    return (
        <div>
            <Link
                href="/dashboard/find-a-pro"
                className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-6 transition-colors duration-200"
            >
                <ChevronLeft size={20} />
                <span>Back to find coaches</span>
            </Link>
            <ProfessionalProfileClient professionalId={resolvedParams.id} />
        </div>
    );
}