-- Additive columns on blog_posts (all nullable / defaulted, existing rows unaffected)
ALTER TABLE public.blog_posts
  ADD COLUMN IF NOT EXISTS focus_keyword text,
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS author_name text,
  ADD COLUMN IF NOT EXISTS medical_reviewer text,
  ADD COLUMN IF NOT EXISTS reading_minutes integer,
  ADD COLUMN IF NOT EXISTS summary text,
  ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS scheduled_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS cover_image_alt text,
  ADD COLUMN IF NOT EXISTS view_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS faqs jsonb NOT NULL DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS blog_posts_featured_idx ON public.blog_posts (is_featured) WHERE is_featured;
CREATE INDEX IF NOT EXISTS blog_posts_scheduled_idx ON public.blog_posts (scheduled_at);

-- Revision history
CREATE TABLE IF NOT EXISTS public.blog_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.blog_posts(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text NOT NULL,
  excerpt text,
  note text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS blog_revisions_post_idx ON public.blog_revisions (post_id, created_at DESC);

GRANT SELECT, INSERT ON public.blog_revisions TO authenticated;
GRANT ALL ON public.blog_revisions TO service_role;

ALTER TABLE public.blog_revisions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can view blog revisions" ON public.blog_revisions;
CREATE POLICY "Staff can view blog revisions"
  ON public.blog_revisions FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Staff can create blog revisions" ON public.blog_revisions;
CREATE POLICY "Staff can create blog revisions"
  ON public.blog_revisions FOR INSERT TO authenticated
  WITH CHECK (public.is_staff(auth.uid()) AND created_by = auth.uid());

-- Safe public view counter (no table write access granted to anon)
CREATE OR REPLACE FUNCTION public.increment_blog_view(_slug text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.blog_posts
     SET view_count = view_count + 1
   WHERE slug = _slug AND is_published = true;
$$;

REVOKE ALL ON FUNCTION public.increment_blog_view(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_blog_view(text) TO anon, authenticated;