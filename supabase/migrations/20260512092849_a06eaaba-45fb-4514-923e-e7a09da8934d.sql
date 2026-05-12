
-- Lock down patients table: remove public access policies
DROP POLICY IF EXISTS "Anyone can check existing patient by phone" ON public.patients;
DROP POLICY IF EXISTS "Anyone can create patient for booking" ON public.patients;

-- Lock down appointments table: remove public access policies
DROP POLICY IF EXISTS "Anyone can check appointment availability" ON public.appointments;
DROP POLICY IF EXISTS "Anyone can create appointment for booking" ON public.appointments;

-- Restrict staff public exposure: remove email/phone from public access
-- Drop the public SELECT policy on staff
DROP POLICY IF EXISTS "Anyone can view active staff" ON public.staff;

-- Create a public-safe view of staff (only non-sensitive columns)
CREATE OR REPLACE VIEW public.public_staff
WITH (security_invoker = true) AS
SELECT
  id,
  full_name,
  specialization,
  bio,
  avatar_url,
  working_days,
  working_hours_start,
  working_hours_end,
  is_active
FROM public.staff
WHERE is_active = true;

GRANT SELECT ON public.public_staff TO anon, authenticated;

-- Add a staff-only narrow SELECT policy for appointments time-slot lookup
-- (replaced by edge function; nothing public needed)

-- Add rate-limit-friendly insert policy on messages by enforcing field length via trigger
CREATE OR REPLACE FUNCTION public.validate_message_input()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF length(NEW.full_name) = 0 OR length(NEW.full_name) > 100 THEN
    RAISE EXCEPTION 'Invalid name length';
  END IF;
  IF length(NEW.phone) = 0 OR length(NEW.phone) > 30 THEN
    RAISE EXCEPTION 'Invalid phone length';
  END IF;
  IF NEW.email IS NOT NULL AND length(NEW.email) > 255 THEN
    RAISE EXCEPTION 'Invalid email length';
  END IF;
  IF length(NEW.subject) = 0 OR length(NEW.subject) > 200 THEN
    RAISE EXCEPTION 'Invalid subject length';
  END IF;
  IF length(NEW.message) = 0 OR length(NEW.message) > 2000 THEN
    RAISE EXCEPTION 'Invalid message length';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_message_input_trigger ON public.messages;
CREATE TRIGGER validate_message_input_trigger
BEFORE INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.validate_message_input();
