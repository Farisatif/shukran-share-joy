-- Explicit deny-all policies (no client should ever access this table; only service role).
CREATE POLICY "admin_settings_deny_select" ON public.admin_settings
  FOR SELECT TO public USING (false);
CREATE POLICY "admin_settings_deny_insert" ON public.admin_settings
  FOR INSERT TO public WITH CHECK (false);
CREATE POLICY "admin_settings_deny_update" ON public.admin_settings
  FOR UPDATE TO public USING (false) WITH CHECK (false);
CREATE POLICY "admin_settings_deny_delete" ON public.admin_settings
  FOR DELETE TO public USING (false);