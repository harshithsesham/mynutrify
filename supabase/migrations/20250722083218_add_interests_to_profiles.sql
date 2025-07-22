ALTER TABLE public.profiles
    ADD COLUMN interests TEXT[];

-- Create a table to store client reviews for professionals
CREATE TABLE public.reviews (
                                id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
                                professional_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
                                client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
                                rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
                                content TEXT,
                                created_at TIMESTAMPTZ DEFAULT NOW(),
                                UNIQUE(professional_id, client_id) -- A client can only review a professional once
);

-- Add Row Level Security for the new reviews table
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Policies for 'reviews'
CREATE POLICY "Users can view all reviews" ON public.reviews FOR SELECT TO authenticated USING (true);

CREATE POLICY "Clients can create reviews for professionals" ON public.reviews FOR INSERT TO authenticated WITH CHECK (
  (SELECT profiles.user_id FROM public.profiles WHERE profiles.id = reviews.client_id) = auth.uid()
);

CREATE POLICY "Clients can update their own reviews" ON public.reviews FOR UPDATE TO authenticated USING (
                                                                                      (SELECT profiles.user_id FROM public.profiles WHERE profiles.id = reviews.client_id) = auth.uid()
                                                                                      );

-- This is the corrected policy. It now compares the client's user_id to the logged-in user's id.
CREATE POLICY "Clients can delete their own reviews" ON public.reviews FOR DELETE TO authenticated USING (
  (SELECT profiles.user_id FROM public.profiles WHERE profiles.id = reviews.client_id) = auth.uid()
);