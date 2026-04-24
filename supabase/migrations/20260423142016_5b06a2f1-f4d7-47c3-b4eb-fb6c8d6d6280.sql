-- Admin settings singleton table for CMS password + recovery code
CREATE TABLE public.admin_settings (
  id text PRIMARY KEY DEFAULT 'singleton',
  password_hash text NOT NULL,
  recovery_code_hash text NOT NULL,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT admin_settings_singleton CHECK (id = 'singleton')
);

ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

-- No client policies whatsoever — only service role (server functions) can touch it.

-- Bootstrap with bcrypt hash of "Zoom100*" and initial recovery code "P4DK-4U4Y-BSJE-9QQH-PT89-26MD"
-- (raw form: P4DK4U4YBSJE9QQHPT8926MD)
INSERT INTO public.admin_settings (id, password_hash, recovery_code_hash)
VALUES (
  'singleton',
  '$2b$10$Pb66R.3.61v4Ox0zQRBgpOG/LnqNGrO3aq68mTJzrno3aJyXT.gu.',
  '$2b$10$mjW7JbRpTAVhAjnObqelB.wdq2KGHWNcFRFnaZ8jyc9NUg68yvFVC'
);