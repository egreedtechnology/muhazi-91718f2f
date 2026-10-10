ALTER TABLE public.patient_reviews
  ADD COLUMN IF NOT EXISTS staff_reply text,
  ADD COLUMN IF NOT EXISTS replied_at timestamptz,
  ADD COLUMN IF NOT EXISTS replied_by uuid,
  ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false;

GRANT UPDATE ON public.patient_reviews TO authenticated;

CREATE POLICY "Staff can update reviews" ON public.patient_reviews
  FOR UPDATE TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));

CREATE OR REPLACE FUNCTION public.validate_patient_review()
 RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.rating < 1 OR NEW.rating > 5 THEN RAISE EXCEPTION 'Rating must be 1 to 5'; END IF;
  IF NEW.feedback IS NOT NULL AND length(NEW.feedback) > 2000 THEN RAISE EXCEPTION 'Feedback too long'; END IF;
  IF NEW.staff_reply IS NOT NULL AND length(NEW.staff_reply) > 2000 THEN RAISE EXCEPTION 'Reply too long'; END IF;
  IF TG_OP = 'UPDATE' THEN
    NEW.rating := OLD.rating;
    NEW.feedback := OLD.feedback;
    NEW.patient_account_id := OLD.patient_account_id;
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.get_public_reviews(_limit int DEFAULT 50)
RETURNS TABLE(id uuid, rating smallint, feedback text, staff_reply text, created_at timestamptz, first_name text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT r.id, r.rating, r.feedback, r.staff_reply, r.created_at,
         split_part(coalesce(p.full_name, 'Patient'), ' ', 1)
  FROM public.patient_reviews r
  LEFT JOIN public.patient_accounts a ON a.id = r.patient_account_id
  LEFT JOIN public.patients p ON p.id = a.patient_id
  WHERE r.is_public = true
  ORDER BY r.created_at DESC
  LIMIT LEAST(GREATEST(_limit, 1), 100);
$$;
GRANT EXECUTE ON FUNCTION public.get_public_reviews(int) TO anon, authenticated;