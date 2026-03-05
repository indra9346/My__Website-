
-- Add category column to projects table
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'Personal Projects';

-- Drop ALL existing restrictive policies
DROP POLICY IF EXISTS "Public can view projects" ON public.projects;
DROP POLICY IF EXISTS "Auth users can insert projects" ON public.projects;
DROP POLICY IF EXISTS "Auth users can update projects" ON public.projects;
DROP POLICY IF EXISTS "Auth users can delete projects" ON public.projects;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.projects;
DROP POLICY IF EXISTS "Anyone can read projects" ON public.projects;
DROP POLICY IF EXISTS "Authenticated users can insert projects" ON public.projects;
DROP POLICY IF EXISTS "Authenticated users can update projects" ON public.projects;
DROP POLICY IF EXISTS "Authenticated users can delete projects" ON public.projects;

-- Create PERMISSIVE policies (default is permissive)
CREATE POLICY "Public read projects" ON public.projects FOR SELECT USING (true);
CREATE POLICY "Auth insert projects" ON public.projects FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth update projects" ON public.projects FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth delete projects" ON public.projects FOR DELETE TO authenticated USING (true);
