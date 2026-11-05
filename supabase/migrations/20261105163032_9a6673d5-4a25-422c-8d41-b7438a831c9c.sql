CREATE TABLE public.social_scheduled_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  caption text NOT NULL,
  media_url text,
  media_type text NOT NULL DEFAULT 'none',
  platforms text[] NOT NULL,
  scheduled_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'scheduled',
  results jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.social_scheduled_posts TO authenticated;
GRANT ALL ON public.social_scheduled_posts TO service_role;
ALTER TABLE public.social_scheduled_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY social_scheduled_read ON public.social_scheduled_posts FOR SELECT TO authenticated USING (social_private.can_use_social_hub(auth.uid()));
CREATE POLICY social_scheduled_cancel ON public.social_scheduled_posts FOR UPDATE TO authenticated
  USING (social_private.can_use_social_hub(auth.uid()) AND status = 'scheduled')
  WITH CHECK (social_private.can_use_social_hub(auth.uid()) AND status IN ('scheduled','cancelled'));
CREATE INDEX social_scheduled_due ON public.social_scheduled_posts (scheduled_at) WHERE status = 'scheduled';
CREATE TRIGGER social_scheduled_updated BEFORE UPDATE ON public.social_scheduled_posts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE OR REPLACE FUNCTION public.validate_social_scheduled()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.status NOT IN ('scheduled','publishing','published','partial','failed','cancelled') THEN RAISE EXCEPTION 'Invalid status'; END IF;
  IF NEW.media_type NOT IN ('none','image','video') THEN RAISE EXCEPTION 'Invalid media type'; END IF;
  IF length(NEW.caption) = 0 OR length(NEW.caption) > 2200 THEN RAISE EXCEPTION 'Invalid caption'; END IF;
  IF TG_OP = 'UPDATE' AND current_setting('request.jwt.claim.role', true) = 'authenticated' THEN
    NEW.caption := OLD.caption; NEW.media_url := OLD.media_url; NEW.media_type := OLD.media_type;
    NEW.platforms := OLD.platforms; NEW.results := OLD.results; NEW.created_by := OLD.created_by;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER validate_social_scheduled BEFORE INSERT OR UPDATE ON public.social_scheduled_posts FOR EACH ROW EXECUTE FUNCTION public.validate_social_scheduled();
ALTER PUBLICATION supabase_realtime ADD TABLE public.social_scheduled_posts;