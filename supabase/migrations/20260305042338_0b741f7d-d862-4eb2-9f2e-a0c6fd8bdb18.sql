
-- Drop all existing RESTRICTIVE policies
DROP POLICY IF EXISTS "Anyone can read projects" ON public.projects;
DROP POLICY IF EXISTS "Authenticated users can insert projects" ON public.projects;
DROP POLICY IF EXISTS "Authenticated users can update projects" ON public.projects;
DROP POLICY IF EXISTS "Authenticated users can delete projects" ON public.projects;

-- Recreate as PERMISSIVE policies (default behavior)
CREATE POLICY "Public can view projects" ON public.projects FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Auth users can insert projects" ON public.projects FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth users can update projects" ON public.projects FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth users can delete projects" ON public.projects FOR DELETE TO authenticated USING (true);
