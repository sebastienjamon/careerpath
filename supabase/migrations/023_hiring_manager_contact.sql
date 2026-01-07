-- Add hiring_manager_contact_id to recruitment_processes to track the hiring manager
ALTER TABLE public.recruitment_processes
    ADD COLUMN IF NOT EXISTS hiring_manager_contact_id UUID REFERENCES public.network_connections(id) ON DELETE SET NULL;

-- Add index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_recruitment_processes_hiring_manager ON public.recruitment_processes(hiring_manager_contact_id);

-- Add comment for documentation
COMMENT ON COLUMN public.recruitment_processes.hiring_manager_contact_id IS 'Reference to the hiring manager contact from the user network';
