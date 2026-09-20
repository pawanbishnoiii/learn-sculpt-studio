ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS theme_mode text NOT NULL DEFAULT 'light',
  ADD COLUMN IF NOT EXISTS accent_style text NOT NULL DEFAULT 'classic',
  ADD COLUMN IF NOT EXISTS gender_palette_suggested boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.user_settings.theme_mode IS 'User-selected light or dark appearance mode.';
COMMENT ON COLUMN public.user_settings.accent_style IS 'User-selected semantic accent palette.';
COMMENT ON COLUMN public.user_settings.gender_palette_suggested IS 'Whether the optional gender-based palette suggestion has been shown.';