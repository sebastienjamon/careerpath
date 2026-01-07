-- Add linked_step_id to allow output steps to reference the step they're reflecting on
ALTER TABLE public.process_steps
    ADD COLUMN IF NOT EXISTS linked_step_id UUID REFERENCES public.process_steps(id) ON DELETE SET NULL;

-- Add index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_process_steps_linked_step_id ON public.process_steps(linked_step_id);

-- Add comment for documentation
COMMENT ON COLUMN public.process_steps.linked_step_id IS 'For output steps: references the interview step this output is reflecting on';
