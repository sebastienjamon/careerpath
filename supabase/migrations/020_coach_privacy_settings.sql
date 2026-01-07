-- Add privacy settings to coaches table
ALTER TABLE public.coaches
ADD COLUMN IF NOT EXISTS display_name TEXT,
ADD COLUMN IF NOT EXISTS show_real_identity BOOLEAN DEFAULT true;

COMMENT ON COLUMN public.coaches.display_name IS 'Optional display name for coaches who prefer not to show their real name';
COMMENT ON COLUMN public.coaches.show_real_identity IS 'Whether to show real name and photo (true) or use display_name and avatar (false)';
