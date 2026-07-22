-- Keep-alive endpoint to prevent Free-plan inactivity pausing.
--
-- Supabase pauses Free-plan projects after ~7 days of low database activity
-- (https://supabase.com/docs/guides/platform/free-project-pausing). The
-- scheduled job in .github/workflows/keep-alive.yml calls this function via
-- POST /rest/v1/rpc/keepalive to run a lightweight, guaranteed query on a
-- fixed schedule, which registers activity and keeps the project active.

CREATE OR REPLACE FUNCTION public.keepalive()
RETURNS timestamptz
LANGUAGE sql
STABLE
AS $$
  SELECT now();
$$;

COMMENT ON FUNCTION public.keepalive() IS
  'No-op called by the scheduled keep-alive job to register database activity and prevent Free-plan inactivity pausing.';

-- Least privilege: only the API roles the keep-alive job uses may execute.
REVOKE ALL ON FUNCTION public.keepalive() FROM public;
GRANT EXECUTE ON FUNCTION public.keepalive() TO anon, authenticated;
