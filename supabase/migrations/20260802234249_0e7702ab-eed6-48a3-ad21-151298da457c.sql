-- Notification preferences
CREATE TABLE public.patient_notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_account_id uuid NOT NULL UNIQUE REFERENCES public.patient_accounts(id) ON DELETE CASCADE,
  email_enabled boolean NOT NULL DEFAULT true,
  sms_enabled boolean NOT NULL DEFAULT false,
  whatsapp_enabled boolean NOT NULL DEFAULT false,
  appointment_reminders boolean NOT NULL DEFAULT true,
  appointment_updates boolean NOT NULL DEFAULT true,
  treatment_updates boolean NOT NULL DEFAULT true,
  reminder_hours_before integer NOT NULL DEFAULT 24,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.patient_notification_preferences TO authenticated;
GRANT ALL ON public.patient_notification_preferences TO service_role;

ALTER TABLE public.patient_notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Patients manage own notification preferences"
ON public.patient_notification_preferences FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.patient_accounts pa WHERE pa.id = patient_account_id AND pa.user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.patient_accounts pa WHERE pa.id = patient_account_id AND pa.user_id = auth.uid()));

CREATE POLICY "Staff can view notification preferences"
ON public.patient_notification_preferences FOR SELECT TO authenticated
USING (public.is_staff(auth.uid()));

CREATE TRIGGER update_patient_notification_preferences_updated_at
BEFORE UPDATE ON public.patient_notification_preferences
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Patient messages (portal inbox)
CREATE TABLE public.patient_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_account_id uuid NOT NULL REFERENCES public.patient_accounts(id) ON DELETE CASCADE,
  appointment_id uuid REFERENCES public.appointments(id) ON DELETE SET NULL,
  sender_role text NOT NULL DEFAULT 'patient',
  sender_user_id uuid,
  subject text,
  body text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  read_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT patient_messages_sender_role_check CHECK (sender_role IN ('patient','staff')),
  CONSTRAINT patient_messages_body_length CHECK (char_length(body) BETWEEN 1 AND 2000),
  CONSTRAINT patient_messages_subject_length CHECK (subject IS NULL OR char_length(subject) <= 200)
);

CREATE INDEX idx_patient_messages_account ON public.patient_messages(patient_account_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE ON public.patient_messages TO authenticated;
GRANT ALL ON public.patient_messages TO service_role;

ALTER TABLE public.patient_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Patients can view own messages"
ON public.patient_messages FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.patient_accounts pa WHERE pa.id = patient_account_id AND pa.user_id = auth.uid()));

CREATE POLICY "Patients can send own messages"
ON public.patient_messages FOR INSERT TO authenticated
WITH CHECK (
  sender_role = 'patient'
  AND sender_user_id = auth.uid()
  AND EXISTS (SELECT 1 FROM public.patient_accounts pa WHERE pa.id = patient_account_id AND pa.user_id = auth.uid())
);

CREATE POLICY "Patients can mark own messages read"
ON public.patient_messages FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.patient_accounts pa WHERE pa.id = patient_account_id AND pa.user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.patient_accounts pa WHERE pa.id = patient_account_id AND pa.user_id = auth.uid()));

CREATE POLICY "Staff can view patient messages"
ON public.patient_messages FOR SELECT TO authenticated
USING (public.is_staff(auth.uid()));

CREATE POLICY "Staff can reply to patient messages"
ON public.patient_messages FOR INSERT TO authenticated
WITH CHECK (public.is_staff(auth.uid()) AND sender_role = 'staff' AND sender_user_id = auth.uid());

CREATE POLICY "Staff can update patient messages"
ON public.patient_messages FOR UPDATE TO authenticated
USING (public.is_staff(auth.uid()))
WITH CHECK (public.is_staff(auth.uid()));

CREATE TRIGGER update_patient_messages_updated_at
BEFORE UPDATE ON public.patient_messages
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();