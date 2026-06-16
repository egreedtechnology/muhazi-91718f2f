DROP POLICY IF EXISTS "Anyone can view active gallery media" ON public.gallery_media;
DROP POLICY IF EXISTS "Staff can view all gallery media" ON public.gallery_media;
DROP POLICY IF EXISTS "Super admins can manage gallery media" ON public.gallery_media;

CREATE POLICY "Anyone can view active gallery media"
ON public.gallery_media
FOR SELECT
TO anon, authenticated
USING (is_active = true);

CREATE POLICY "Staff can view all gallery media"
ON public.gallery_media
FOR SELECT
TO authenticated
USING (public.is_staff(auth.uid()));

CREATE POLICY "Super admins can manage gallery media"
ON public.gallery_media
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

GRANT SELECT ON public.gallery_media TO anon, authenticated;
GRANT ALL ON public.gallery_media TO service_role;