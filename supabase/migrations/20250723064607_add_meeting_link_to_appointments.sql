-- Add a new column to the appointments table to store the URL for the virtual meeting.
ALTER TABLE public.appointments
    ADD COLUMN IF NOT EXISTS meeting_link TEXT;