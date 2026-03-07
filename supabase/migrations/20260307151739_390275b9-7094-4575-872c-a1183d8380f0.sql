-- Drop all existing RESTRICTIVE policies
DROP POLICY IF EXISTS "allow_public_read" ON public.projects;
DROP POLICY IF EXISTS "allow_auth_insert" ON public.projects;
DROP POLICY IF EXISTS "allow_auth_update" ON public.projects;
DROP POLICY IF EXISTS "allow_auth_delete" ON public.projects;

-- Create PERMISSIVE policies (the default and correct type)
CREATE POLICY "public_read" ON public.projects
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "auth_insert" ON public.projects
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "auth_update" ON public.projects
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "auth_delete" ON public.projects
  FOR DELETE TO authenticated
  USING (true);