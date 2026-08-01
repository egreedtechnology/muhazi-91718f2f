-- 1. RETENTION POLICIES ------------------------------------------------------
CREATE TABLE public.retention_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  record_type text NOT NULL UNIQUE,
  label text NOT NULL,
  retention_years integer NOT NULL DEFAULT 10,
  minor_until_age integer,
  legal_basis text,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.retention_policies TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.retention_policies TO authenticated;
GRANT ALL ON public.retention_policies TO service_role;

ALTER TABLE public.retention_policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view retention policies"
  ON public.retention_policies FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));

CREATE POLICY "Super admins manage retention policies"
  ON public.retention_policies FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE TRIGGER update_retention_policies_updated_at
  BEFORE UPDATE ON public.retention_policies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.retention_policies (record_type, label, retention_years, minor_until_age, legal_basis, description) VALUES
  ('patients', 'Patient clinical file', 10, 25, 'GDPR Art.5(1)(e) / FDI & GDC dental record retention guidance', 'Adult dental records retained 10 years after last treatment; minors retained until age 25 or 10 years, whichever is longer.'),
  ('treatment_records', 'Treatment & clinical notes', 10, 25, 'FDI World Dental Federation clinical record guidance', 'Clinical notes, diagnoses and procedures performed.'),
  ('appointments', 'Appointment history', 5, NULL, 'Operational / continuity of care', 'Scheduling history retained 5 years for continuity of care and audit.'),
  ('intake_forms', 'Medical history & consent forms', 10, 25, 'Informed consent record keeping', 'Signed medical history and consent documentation.'),
  ('messages', 'Patient correspondence', 2, NULL, 'GDPR data minimisation', 'General enquiries and correspondence.');

-- 2. ARCHIVED RECORDS ---------------------------------------------------------
CREATE TABLE public.archived_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_table text NOT NULL,
  source_id uuid NOT NULL,
  label text NOT NULL,
  summary text,
  snapshot jsonb NOT NULL,
  checksum text,
  patient_ref uuid,
  reason text,
  archived_by uuid REFERENCES auth.users(id),
  archived_at timestamptz NOT NULL DEFAULT now(),
  retention_until date,
  legal_hold boolean NOT NULL DEFAULT false,
  legal_hold_reason text,
  status text NOT NULL DEFAULT 'archived',
  restored_at timestamptz,
  restored_by uuid REFERENCES auth.users(id),
  purged_at timestamptz,
  purged_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_archived_records_source ON public.archived_records (source_table, source_id);
CREATE INDEX idx_archived_records_status ON public.archived_records (status, archived_at DESC);
CREATE INDEX idx_archived_records_retention ON public.archived_records (retention_until);

GRANT SELECT ON public.archived_records TO authenticated;
GRANT INSERT, UPDATE ON public.archived_records TO authenticated;
GRANT ALL ON public.archived_records TO service_role;

ALTER TABLE public.archived_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view archived records"
  ON public.archived_records FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));

CREATE POLICY "Admins and managers can archive records"
  ON public.archived_records FOR INSERT TO authenticated
  WITH CHECK (
    (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'manager'))
    AND archived_by = auth.uid()
  );

CREATE POLICY "Admins and managers can update archive state"
  ON public.archived_records FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'manager'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'manager'));

CREATE TRIGGER update_archived_records_updated_at
  BEFORE UPDATE ON public.archived_records
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Guard: block purge while under legal hold or before retention expiry
CREATE OR REPLACE FUNCTION public.guard_archive_purge()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'purged' AND OLD.status <> 'purged' THEN
    IF NOT public.has_role(auth.uid(), 'super_admin') THEN
      RAISE EXCEPTION 'Only super admins can purge archived records';
    END IF;
    IF OLD.legal_hold THEN
      RAISE EXCEPTION 'Record is under legal hold and cannot be purged';
    END IF;
    IF OLD.retention_until IS NOT NULL AND OLD.retention_until > CURRENT_DATE THEN
      RAISE EXCEPTION 'Retention period has not expired (until %)', OLD.retention_until;
    END IF;
    NEW.snapshot = '{"redacted": true}'::jsonb;
    NEW.purged_at = now();
    NEW.purged_by = auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER guard_archived_records_purge
  BEFORE UPDATE ON public.archived_records
  FOR EACH ROW EXECUTE FUNCTION public.guard_archive_purge();

-- 3. BACKUP RUNS --------------------------------------------------------------
CREATE TABLE public.backup_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL DEFAULT 'manual_export',
  scope text NOT NULL,
  status text NOT NULL DEFAULT 'completed',
  record_count integer NOT NULL DEFAULT 0,
  size_bytes bigint NOT NULL DEFAULT 0,
  checksum text,
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_backup_runs_created ON public.backup_runs (created_at DESC);

GRANT SELECT, INSERT ON public.backup_runs TO authenticated;
GRANT ALL ON public.backup_runs TO service_role;

ALTER TABLE public.backup_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view backup history"
  ON public.backup_runs FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));

CREATE POLICY "Admins and managers can log backups"
  ON public.backup_runs FOR INSERT TO authenticated
  WITH CHECK (
    (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'manager'))
    AND created_by = auth.uid()
  );

-- 4. ARCHIVE MARKERS ON SOURCE TABLES ----------------------------------------
ALTER TABLE public.patients          ADD COLUMN IF NOT EXISTS archived_at timestamptz, ADD COLUMN IF NOT EXISTS archived_by uuid;
ALTER TABLE public.appointments      ADD COLUMN IF NOT EXISTS archived_at timestamptz, ADD COLUMN IF NOT EXISTS archived_by uuid;
ALTER TABLE public.treatment_records ADD COLUMN IF NOT EXISTS archived_at timestamptz, ADD COLUMN IF NOT EXISTS archived_by uuid;
ALTER TABLE public.intake_forms      ADD COLUMN IF NOT EXISTS archived_at timestamptz, ADD COLUMN IF NOT EXISTS archived_by uuid;
ALTER TABLE public.messages          ADD COLUMN IF NOT EXISTS archived_at timestamptz, ADD COLUMN IF NOT EXISTS archived_by uuid;

CREATE INDEX IF NOT EXISTS idx_patients_archived ON public.patients (archived_at);
CREATE INDEX IF NOT EXISTS idx_appointments_archived ON public.appointments (archived_at);
CREATE INDEX IF NOT EXISTS idx_messages_archived ON public.messages (archived_at);