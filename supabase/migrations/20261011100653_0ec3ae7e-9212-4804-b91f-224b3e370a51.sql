CREATE TABLE public.social_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform text NOT NULL UNIQUE,
  account_name text,
  account_id text,
  page_id text,
  status text NOT NULL DEFAULT 'disconnected',
  scopes text[] NOT NULL DEFAULT '{}',
  last_checked_at timestamptz,
  notes text,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.social_connections TO authenticated;
GRANT ALL ON public.social_connections TO service_role;
ALTER TABLE public.social_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff view social connections" ON public.social_connections FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Admins insert social connections" ON public.social_connections FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'manager'));
CREATE POLICY "Admins update social connections" ON public.social_connections FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'manager'));
CREATE TRIGGER trg_social_connections_updated BEFORE UPDATE ON public.social_connections FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
INSERT INTO public.social_connections (platform) VALUES ('facebook'),('instagram'),('whatsapp'),('linkedin'),('x'),('tiktok');