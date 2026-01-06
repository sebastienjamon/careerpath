-- Add OTE (On-Target Earnings) and currency fields to career_experiences
ALTER TABLE public.career_experiences
    ADD COLUMN IF NOT EXISTS ote INTEGER,
    ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD';

COMMENT ON COLUMN public.career_experiences.ote IS 'On-Target Earnings / Annual Salary';
COMMENT ON COLUMN public.career_experiences.currency IS 'Currency code (USD, EUR, GBP, etc.)';
