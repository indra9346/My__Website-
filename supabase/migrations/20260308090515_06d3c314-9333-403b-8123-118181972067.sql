
CREATE TABLE public.promotions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  offer_text text DEFAULT NULL,
  discount_percentage integer DEFAULT NULL,
  cta_text text NOT NULL DEFAULT 'Contact Now',
  cta_link text NOT NULL DEFAULT '#contact',
  bg_image text DEFAULT NULL,
  active boolean NOT NULL DEFAULT true,
  start_date timestamptz DEFAULT NULL,
  end_date timestamptz DEFAULT NULL,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;

-- Public can read active promotions
CREATE POLICY "public_read_active" ON public.promotions
  FOR SELECT TO anon, authenticated
  USING (active = true AND (start_date IS NULL OR start_date <= now()) AND (end_date IS NULL OR end_date >= now()));

-- Authenticated admin can do everything
CREATE POLICY "auth_insert" ON public.promotions
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "auth_update" ON public.promotions
  FOR UPDATE TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "auth_delete" ON public.promotions
  FOR DELETE TO authenticated
  USING (true);

-- Admin can read all (including inactive) 
CREATE POLICY "auth_read_all" ON public.promotions
  FOR SELECT TO authenticated
  USING (true);

-- Insert default promotional banner
INSERT INTO public.promotions (title, description, offer_text, cta_text, cta_link, active)
VALUES (
  '🚀 Web Development Services',
  'I am ready to develop websites for clients. Contact me to build your professional website.',
  'Available Now',
  'Hire Me',
  '#contact',
  true
);
