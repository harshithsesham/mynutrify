-- Add a new column to the profiles table to securely store the Google OAuth refresh token.
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS google_refresh_token TEXT;

-- It's good practice to add a policy to ensure users can only update their own token.
-- This replaces the existing update policy with a more complete one.
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
                    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);