-- Create a table to link coaches (professionals) to their clients
CREATE TABLE IF NOT EXISTS public.coach_clients (
                                                    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
                                                    coach_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(coach_id, client_id) -- A coach can only have a client once
    );

-- Create a table for nutrition plans
CREATE TABLE IF NOT EXISTS public.nutrition_plans (
                                                      id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
                                                      created_by_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE, -- Can be a coach or a client
    assigned_to_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE, -- The person who the plan is for
    title TEXT NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
    );

-- Create a table for the individual food entries within a plan
CREATE TABLE IF NOT EXISTS public.nutrition_plan_entries (
                                                             id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
                                                             plan_id BIGINT NOT NULL REFERENCES public.nutrition_plans(id) ON DELETE CASCADE,
    meal_type TEXT NOT NULL CHECK (meal_type IN ('Breakfast', 'Lunch', 'Dinner', 'Snacks')),
    food_name TEXT NOT NULL,
    quantity_grams INT,
    calories INT,
    protein INT,
    carbs INT,
    fats INT
    );

-- Add Row Level Security for the new tables
ALTER TABLE public.coach_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nutrition_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nutrition_plan_entries ENABLE ROW LEVEL SECURITY;

-- Policies for 'coach_clients'
DROP POLICY IF EXISTS "Users can view their own coach/client relationships" ON public.coach_clients;
CREATE POLICY "Users can view their own coach/client relationships" ON public.coach_clients FOR SELECT USING ( (SELECT profiles.user_id FROM public.profiles WHERE profiles.id = coach_id) = auth.uid() OR (SELECT profiles.user_id FROM public.profiles WHERE profiles.id = client_id) = auth.uid() );

DROP POLICY IF EXISTS "Coaches can add clients" ON public.coach_clients;
CREATE POLICY "Coaches can add clients" ON public.coach_clients FOR INSERT WITH CHECK ( (SELECT profiles.user_id FROM public.profiles WHERE profiles.id = coach_id) = auth.uid() );

-- Policies for 'nutrition_plans'
DROP POLICY IF EXISTS "Users can view plans created for them or by them" ON public.nutrition_plans;
CREATE POLICY "Users can view plans created for them or by them" ON public.nutrition_plans FOR SELECT USING ( (SELECT profiles.user_id FROM public.profiles WHERE profiles.id = created_by_id) = auth.uid() OR (SELECT profiles.user_id FROM public.profiles WHERE profiles.id = assigned_to_id) = auth.uid() );

DROP POLICY IF EXISTS "Users can create plans for themselves or their clients" ON public.nutrition_plans;
CREATE POLICY "Users can create plans for themselves or their clients" ON public.nutrition_plans FOR INSERT WITH CHECK ( (SELECT profiles.user_id FROM public.profiles WHERE profiles.id = created_by_id) = auth.uid() );

-- Policies for 'nutrition_plan_entries'
DROP POLICY IF EXISTS "Users can view entries for plans they have access to" ON public.nutrition_plan_entries;
CREATE POLICY "Users can view entries for plans they have access to" ON public.nutrition_plan_entries FOR SELECT USING (
                                                                                                                               EXISTS (
                                                                                                                               SELECT 1 FROM public.nutrition_plans WHERE nutrition_plans.id = plan_id
                                                                                                                               )
                                                                                                                               );

DROP POLICY IF EXISTS "Users can add entries to plans they created" ON public.nutrition_plan_entries;
CREATE POLICY "Users can add entries to plans they created" ON public.nutrition_plan_entries FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.nutrition_plans WHERE nutrition_plans.id = plan_id AND (SELECT profiles.user_id FROM public.profiles WHERE profiles.id = nutrition_plans.created_by_id) = auth.uid()
  )
);
