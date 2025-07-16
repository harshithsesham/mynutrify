-- First, let's add some columns to the existing profiles table
-- to store information relevant for professionals.
ALTER TABLE public.profiles
    ADD COLUMN bio TEXT,
ADD COLUMN specialties TEXT[], -- Array of text for things like 'weight loss', 'sports nutrition'
ADD COLUMN hourly_rate NUMERIC(10, 2); -- e.g., 75.00

-- Table to store the working hours/availability for professionals.
-- This allows them to set a recurring weekly schedule.
CREATE TABLE public.availability (
                                     id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
                                     professional_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    -- Day of the week, where 0 = Sunday, 1 = Monday, ..., 6 = Saturday
                                     day_of_week INT NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
                                     start_time TIME NOT NULL,
                                     end_time TIME NOT NULL,
                                     created_at TIMESTAMPTZ DEFAULT NOW(),
                                     UNIQUE(professional_id, day_of_week, start_time) -- Prevent duplicate time slots
);

-- Table to store all booked appointments.
CREATE TABLE public.appointments (
                                     id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
                                     client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
                                     professional_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
                                     start_time TIMESTAMPTZ NOT NULL,
                                     end_time TIMESTAMPTZ NOT NULL,
                                     status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'completed', 'cancelled')),
                                     price NUMERIC(10, 2) NOT NULL,
                                     is_first_consult BOOLEAN DEFAULT FALSE, -- Flag for the "First Consult Free" feature
                                     notes TEXT, -- Notes from the professional after the session
                                     created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add comments to explain the tables and columns for clarity
COMMENT ON COLUMN public.availability.day_of_week IS '0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat';
COMMENT ON COLUMN public.appointments.is_first_consult IS 'True if this is the client''s free first consultation';