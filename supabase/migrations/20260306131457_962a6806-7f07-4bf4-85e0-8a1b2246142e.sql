
-- Drop ALL existing policies on projects (they are RESTRICTIVE, which blocks everything)
DROP POLICY IF EXISTS "Auth delete projects" ON public.projects;
DROP POLICY IF EXISTS "Auth insert projects" ON public.projects;
DROP POLICY IF EXISTS "Auth update projects" ON public.projects;
DROP POLICY IF EXISTS "Public read projects" ON public.projects;

-- Recreate as PERMISSIVE (explicit)
CREATE POLICY "Public read projects" ON public.projects AS PERMISSIVE FOR SELECT USING (true);
CREATE POLICY "Auth insert projects" ON public.projects AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth update projects" ON public.projects AS PERMISSIVE FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth delete projects" ON public.projects AS PERMISSIVE FOR DELETE TO authenticated USING (true);
