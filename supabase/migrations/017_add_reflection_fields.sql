-- Add reflection fields to career_highlights for "What This Demonstrates" section
ALTER TABLE public.career_highlights
    ADD COLUMN IF NOT EXISTS reflection TEXT,
    ADD COLUMN IF NOT EXISTS reflection_tags TEXT[] DEFAULT '{}';

COMMENT ON COLUMN public.career_highlights.reflection IS 'User explanation of why this highlight matters and what values/traits it demonstrates';
COMMENT ON COLUMN public.career_highlights.reflection_tags IS 'AI-generated tags for values/traits (Integrity, Collaboration, etc.)';
