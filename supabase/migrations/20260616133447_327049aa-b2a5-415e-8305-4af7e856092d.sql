
-- Revoke EXECUTE on SECURITY DEFINER functions from anon (they're for authenticated/triggers only)
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_staff(uuid) FROM anon, PUBLIC;

-- Require verified patient account before submitting appointment requests
DROP POLICY IF EXISTS "Patients can create requests" ON public.appointment_requests;
CREATE POLICY "Patients can create requests"
ON public.appointment_requests
FOR INSERT
TO authenticated
WITH CHECK (
  patient_account_id IN (
    SELECT id FROM public.patient_accounts
    WHERE user_id = auth.uid() AND is_verified = true
  )
);

-- Require verified patient account before submitting intake forms
DROP POLICY IF EXISTS "Patients can submit intake forms" ON public.intake_forms;
CREATE POLICY "Patients can submit intake forms"
ON public.intake_forms
FOR INSERT
TO authenticated
WITH CHECK (
  patient_id IN (
    SELECT patient_id FROM public.patient_accounts
    WHERE user_id = auth.uid() AND is_verified = true
  )
);
