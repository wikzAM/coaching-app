-- ============================================
-- Run this in the Supabase SQL Editor
-- Safe to run multiple times (fully idempotent)
-- ============================================

-- 1. Add new columns to the coaches table (IF NOT EXISTS = safe to re-run)
ALTER TABLE public.coaches 
  ADD COLUMN IF NOT EXISTS name text,
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS published boolean DEFAULT false;

-- 2. Create the user_coaches junction table (IF NOT EXISTS = safe to re-run)
CREATE TABLE IF NOT EXISTS public.user_coaches (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  coach_id uuid NOT NULL REFERENCES public.coaches(coach_id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, coach_id)
);

-- 3. Enable RLS (no-op if already enabled)
ALTER TABLE public.user_coaches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coaches ENABLE ROW LEVEL SECURITY;

-- 4. user_coaches policies (DROP IF EXISTS first so this is re-runnable)
DROP POLICY IF EXISTS "Users can view own coach links" ON public.user_coaches;
CREATE POLICY "Users can view own coach links"
  ON public.user_coaches FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own coach links" ON public.user_coaches;
CREATE POLICY "Users can insert own coach links"
  ON public.user_coaches FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own coach links" ON public.user_coaches;
CREATE POLICY "Users can delete own coach links"
  ON public.user_coaches FOR DELETE
  USING (auth.uid() = user_id);

-- 5. coaches policies (DROP IF EXISTS first so this is re-runnable)
--    Users can read coaches they created OR any published coach
DROP POLICY IF EXISTS "Users can read own or published coaches" ON public.coaches;
CREATE POLICY "Users can read own or published coaches"
  ON public.coaches FOR SELECT
  USING (
    created_by = auth.uid() 
    OR published = true
  );

DROP POLICY IF EXISTS "Users can create coaches" ON public.coaches;
CREATE POLICY "Users can create coaches"
  ON public.coaches FOR INSERT
  WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "Creators can update own coaches" ON public.coaches;
CREATE POLICY "Creators can update own coaches"
  ON public.coaches FOR UPDATE
  USING (created_by = auth.uid());

DROP POLICY IF EXISTS "Creators can delete own coaches" ON public.coaches;
CREATE POLICY "Creators can delete own coaches"
  ON public.coaches FOR DELETE
  USING (created_by = auth.uid());

-- NOTE: service_role key (used by edge functions) bypasses RLS automatically.
-- No existing data is deleted or modified — only new columns/table/policies are added.
