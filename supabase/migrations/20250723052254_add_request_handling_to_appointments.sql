-- Add a new column to the appointments table to track if a booking has been handled as a client request.
ALTER TABLE public.appointments
    ADD COLUMN IF NOT EXISTS is_request_handled BOOLEAN DEFAULT FALSE;