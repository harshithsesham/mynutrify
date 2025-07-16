-- Add the missing updated_at column to the profiles table
ALTER TABLE public.profiles
    ADD COLUMN updated_at TIMESTAMPTZ;

-- Optional: Create a trigger to automatically update this column
-- whenever a profile is updated. This is a best practice.
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_profile_updated
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE PROCEDURE public.handle_updated_at();