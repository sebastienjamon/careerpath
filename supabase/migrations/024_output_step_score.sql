-- Add output_score column to process_steps for AI-evaluated interview performance score
ALTER TABLE public.process_steps
    ADD COLUMN IF NOT EXISTS output_score INTEGER CHECK (output_score >= 0 AND output_score <= 100);

-- Add comment for documentation
COMMENT ON COLUMN public.process_steps.output_score IS 'AI-generated score (0-100) evaluating interview performance based on went_well and to_improve items';
