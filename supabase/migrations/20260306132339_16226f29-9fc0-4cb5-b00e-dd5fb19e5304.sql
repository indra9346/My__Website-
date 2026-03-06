
-- Drop ALL existing restrictive policies
DROP POLICY IF EXISTS "Auth delete projects" ON public.projects;
DROP POLICY IF EXISTS "Auth insert projects" ON public.projects;
DROP POLICY IF EXISTS "Auth update projects" ON public.projects;
DROP POLICY IF EXISTS "Public read projects" ON public.projects;
DROP POLICY IF EXISTS "Public can view projects" ON public.projects;
DROP POLICY IF EXISTS "Auth users can insert projects" ON public.projects;
DROP POLICY IF EXISTS "Auth users can update projects" ON public.projects;
DROP POLICY IF EXISTS "Auth users can delete projects" ON public.projects;

-- Recreate ALL as PERMISSIVE explicitly
CREATE POLICY "allow_public_read" ON public.projects AS PERMISSIVE FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "allow_auth_insert" ON public.projects AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "allow_auth_update" ON public.projects AS PERMISSIVE FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "allow_auth_delete" ON public.projects AS PERMISSIVE FOR DELETE TO authenticated USING (true);

-- Insert the DJ Video Editing project under Client Projects
INSERT INTO public.projects (title, "Description", "Image", "Tags", github, "Demo", "Display_Order", category)
VALUES (
  'DJ Video Editing Services – Client Website',
  'Developed and deployed a fully responsive client website for DJ Video Editing Services. Implemented modern UI design, SEO optimization, and production deployment using Vercel. This project demonstrates real-world client handling and live project delivery.',
  NULL,
  ARRAY['React', 'Vite', 'Supabase', 'Vercel', 'SEO', 'Client Project'],
  'https://github.com/indra63461',
  'https://indraportfolio-psi.vercel.app',
  0,
  'Client Projects'
);
