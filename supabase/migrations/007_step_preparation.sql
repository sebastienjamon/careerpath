-- Add preparation fields to process_steps
ALTER TABLE public.process_steps
    ADD COLUMN IF NOT EXISTS description TEXT,
    ADD COLUMN IF NOT EXISTS role_team_notes TEXT,
    ADD COLUMN IF NOT EXISTS prepared_questions TEXT[];

-- Add comment for clarity
COMMENT ON COLUMN public.process_steps.description IS 'The purpose/objective of this interview step';
COMMENT ON COLUMN public.process_steps.role_team_notes IS 'Notes about the role and team';
COMMENT ON COLUMN public.process_steps.prepared_questions IS 'Questions to ask during the interview';
