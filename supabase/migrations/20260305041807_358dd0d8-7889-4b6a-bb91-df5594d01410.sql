
-- Drop any existing restrictive SELECT policy
DROP POLICY IF EXISTS "Enable read access for all users" ON public.projects;

-- Create permissive SELECT policy for public read access
CREATE POLICY "Anyone can read projects" ON public.projects FOR SELECT USING (true);
