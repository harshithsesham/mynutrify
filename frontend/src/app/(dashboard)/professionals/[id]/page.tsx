// app/(dashboard)/professionals/[id]/page.tsx
import ProfessionalProfileClient from './ProfessionalProfileClient';
import React from 'react';

// Define the type for the page's props.
type PageProps = {
    params: Promise<{ id: string }>;
};

export default async function Page({ params }: PageProps): Promise<React.ReactElement> {
    const resolvedParams = await params;
    return <ProfessionalProfileClient professionalId={resolvedParams.id} />;
}