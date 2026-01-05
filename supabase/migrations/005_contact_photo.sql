-- Add photo_url to step_contacts for LinkedIn profile photos
ALTER TABLE public.step_contacts
    ADD COLUMN IF NOT EXISTS photo_url TEXT;
