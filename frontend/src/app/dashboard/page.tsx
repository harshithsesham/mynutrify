// app/(dashboard)/dashboard/page.tsx
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function DashboardPage() {
    const supabase = createServerComponentClient({ cookies });

    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
        redirect('/login');
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role, full_name')
        .eq('id', session.user.id)
        .single();

    if (!profile) {
        // This could happen if the profile creation failed.
        // Handle this case gracefully.
        return <div>Could not find your profile. Please contact support.</div>
    }

    if (!profile.role) {
        // If the user somehow lands here without a role, send them to selection.
        redirect('/role-selection');
    }

    return (
        <div className="p-8 text-white">
            <h1 className="text-4xl font-bold">Welcome, {profile.full_name}!</h1>
            <p className="text-xl mt-2 capitalize bg-green-500/20 text-green-300 px-3 py-1 rounded-full inline-block">
                {profile.role} Dashboard
            </p>
            <div className="mt-8">
                {/* Your role-specific dashboard content goes here */}
                <p>Your personalized dashboard content is coming soon.</p>
            </div>
        </div>
    );
}
