
-- 1) Tighten is_staff to only known staff roles (prevents privilege escalation if new non-staff roles are added)
CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('super_admin', 'dentist', 'receptionist', 'accountant')
  )
$function$;

-- 2) Remove clinic_settings from realtime publication (not needed; admin reads on demand)
ALTER PUBLICATION supabase_realtime DROP TABLE public.clinic_settings;

-- 3) Restrict anonymous EXECUTE on SECURITY DEFINER helpers; only authenticated/service need them
REVOKE EXECUTE ON FUNCTION public.is_staff(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_staff(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

-- 4) Prevent listing of gallery bucket files via storage.objects SELECT.
-- Public bucket URLs continue to work via CDN without needing RLS SELECT.
DROP POLICY IF EXISTS "Anyone can view gallery files" ON storage.objects;
CREATE POLICY "Staff can list gallery files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'gallery' AND public.is_staff(auth.uid()));
