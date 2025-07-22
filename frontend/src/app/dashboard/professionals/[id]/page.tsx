// app/dashboard/professionals/[id]/page.tsx
import ProfessionalProfileClient from './ProfessionalProfileClient';
import React from 'react';

// Define the props type to match what the build process expects,
// which is a Promise containing the params.
type PageProps = {
    params: Promise<{ id: string }>;
};

// Make the component async and await the params to resolve the Promise.
// This directly addresses the build error.
export default async function Page({ params }: PageProps): Promise<React.ReactElement> {
    const resolvedParams = await params;
    return <ProfessionalProfileClient professionalId={resolvedParams.id} />;
}