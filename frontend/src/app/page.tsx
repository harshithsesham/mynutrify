// src/app/page.tsx
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function HomePage() {
  const supabase = createServerComponentClient({ cookies });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session) {
    // If the user is logged in, send them to their dashboard
    redirect('/dashboard');
  } else {
    // If the user is not logged in, send them to the login page
    // This path now matches your folder structure: src/app/auth/login/page.tsx
    redirect('/login');
  }

  // This component will never actually render anything because it always redirects.
  return null;
}