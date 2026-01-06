-- Add referral contact link to recruitment processes
-- When source is 'referral', this links to the network contact who referred you

ALTER TABLE public.recruitment_processes
    ADD COLUMN IF NOT EXISTS referral_contact_id UUID REFERENCES public.network_connections(id) ON DELETE SET NULL;

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_recruitment_processes_referral_contact_id
    ON public.recruitment_processes(referral_contact_id);

COMMENT ON COLUMN public.recruitment_processes.referral_contact_id IS 'Link to the network contact who referred you for this position';
