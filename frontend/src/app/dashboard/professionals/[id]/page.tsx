// app/dashboard/professionals/[id]/page.tsx
import ProfessionalProfileClient from './ProfessionalProfileClient';
import React from 'react';

type PageProps = {
    params: { id: string };
};

// This Server Component now correctly passes the params to the client component.
export default async function Page({ params }: PageProps): Promise<React.ReactElement> {
    return <ProfessionalProfileClient professionalId={params.id} />;
}