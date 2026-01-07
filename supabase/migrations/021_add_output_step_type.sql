-- Add 'output' to the step_type enum for capturing interview reflections
ALTER TYPE step_type ADD VALUE IF NOT EXISTS 'output';

-- Add columns for output step data (bullet points for reflection)
ALTER TABLE public.process_steps
    ADD COLUMN IF NOT EXISTS went_well TEXT[] DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS to_improve TEXT[] DEFAULT '{}';

-- Add comments for documentation
COMMENT ON COLUMN public.process_steps.went_well IS 'Bullet points for what went well in the interview (used by output step type)';
COMMENT ON COLUMN public.process_steps.to_improve IS 'Bullet points for what could be improved (used by output step type)';
