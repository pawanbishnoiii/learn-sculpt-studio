CREATE POLICY legacy_claims_no_browser_access ON public.legacy_user_claims FOR ALL TO authenticated USING(false) WITH CHECK(false);
ALTER FUNCTION public.has_role(uuid,public.app_role) SECURITY INVOKER;
ALTER FUNCTION public.touch_last_seen() SECURITY INVOKER;
REVOKE ALL ON FUNCTION public.has_role(uuid,public.app_role) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.touch_last_seen() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid,public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.touch_last_seen() TO authenticated;