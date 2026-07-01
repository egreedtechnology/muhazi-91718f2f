
-- Extend app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'manager';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'dental_assistant';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'it_admin';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'cashier';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'lab_technician';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'pharmacist';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'nurse';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'cleaner';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'security_guard';

-- Extend staff table
ALTER TABLE public.staff
  ADD COLUMN IF NOT EXISTS department text,
  ADD COLUMN IF NOT EXISTS position text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS last_login_at timestamptz,
  ADD COLUMN IF NOT EXISTS invited_at timestamptz,
  ADD COLUMN IF NOT EXISTS invited_by uuid;

-- Add status check
DO $$ BEGIN
  ALTER TABLE public.staff ADD CONSTRAINT staff_status_check
    CHECK (status IN ('active','pending','suspended','disabled'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
