-- ============================================================
-- 007: Function hardening (Supabase security advisor findings)
--
-- 1. Pin search_path on all SECURITY DEFINER helper functions so they
--    cannot be hijacked via a manipulated search path.
-- 2. Least privilege on function EXECUTE:
--    - RLS helper functions keep EXECUTE for `authenticated` (policies
--      evaluate them as the querying user) but lose it for anon/PUBLIC.
--    - Trigger functions are invoked by triggers, never by clients:
--      no client role needs EXECUTE.
-- ============================================================

ALTER FUNCTION public.get_user_role()                 SET search_path = public;
ALTER FUNCTION public.is_owner()                      SET search_path = public;
ALTER FUNCTION public.is_owner_or_manager()           SET search_path = public;
ALTER FUNCTION public.can_access_property(uuid)       SET search_path = public;
ALTER FUNCTION public.is_property_admin(uuid)         SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.get_user_role()           FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_owner()                FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_owner_or_manager()     FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_access_property(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_property_admin(uuid)   FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.get_user_role()           TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_owner()                TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_owner_or_manager()     TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_property(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_property_admin(uuid)   TO authenticated;

REVOKE EXECUTE ON FUNCTION public.handle_new_user()     FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_property() FROM PUBLIC, anon, authenticated;
