CREATE TABLE public.patient_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_account_id uuid NOT NULL REFERENCES public.patient_accounts(id) ON DELETE CASCADE,
  appointment_id uuid REFERENCES public.appointments(id) ON DELETE SET NULL,
  rating smallint NOT NULL,
  feedback text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (patient_account_id, appointment_id)
);
GRANT SELECT, INSERT, DELETE ON public.patient_reviews TO authenticated;
GRANT ALL ON public.patient_reviews TO service_role;
ALTER TABLE public.patient_reviews ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.validate_patient_review() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.rating < 1 OR NEW.rating > 5 THEN RAISE EXCEPTION 'Rating must be 1 to 5'; END IF;
  IF NEW.feedback IS NOT NULL AND length(NEW.feedback) > 2000 THEN RAISE EXCEPTION 'Feedback too long'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER validate_patient_review BEFORE INSERT OR UPDATE ON public.patient_reviews FOR EACH ROW EXECUTE FUNCTION public.validate_patient_review();

CREATE POLICY "Patients view own reviews" ON public.patient_reviews FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.patient_accounts pa WHERE pa.id = patient_account_id AND pa.user_id = auth.uid()) OR public.is_staff(auth.uid()));
CREATE POLICY "Patients add own reviews" ON public.patient_reviews FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.patient_accounts pa WHERE pa.id = patient_account_id AND pa.user_id = auth.uid())
  AND (appointment_id IS NULL OR EXISTS (SELECT 1 FROM public.appointments a JOIN public.patient_accounts pa ON pa.patient_id = a.patient_id WHERE a.id = appointment_id AND pa.user_id = auth.uid())));
CREATE POLICY "Patients delete own reviews" ON public.patient_reviews FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM public.patient_accounts pa WHERE pa.id = patient_account_id AND pa.user_id = auth.uid()));