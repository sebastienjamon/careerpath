-- Remove unused preparation fields (keep description as interview purpose)
ALTER TABLE public.process_steps
    DROP COLUMN IF EXISTS role_team_notes,
    DROP COLUMN IF EXISTS prepared_questions;

-- Note: keeping 'objectives' as it may be used elsewhere, but we won't use it in the new UI
-- Note: keeping 'description' for interview purpose

-- Add AI recommendations fields
ALTER TABLE public.process_steps
    ADD COLUMN IF NOT EXISTS ai_recommendations TEXT,
    ADD COLUMN IF NOT EXISTS ai_recommendations_updated_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS preparation_notes TEXT;

COMMENT ON COLUMN public.process_steps.ai_recommendations IS 'AI-generated recommendations for interview preparation';
COMMENT ON COLUMN public.process_steps.ai_recommendations_updated_at IS 'When the AI recommendations were last generated';
COMMENT ON COLUMN public.process_steps.preparation_notes IS 'User notes for interview preparation';
