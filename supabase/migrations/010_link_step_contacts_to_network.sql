-- Link step_contacts to network_connections
-- When a contact is added to a step, it should also exist in the network

ALTER TABLE public.step_contacts
    ADD COLUMN IF NOT EXISTS network_connection_id UUID REFERENCES public.network_connections(id) ON DELETE SET NULL;

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_step_contacts_network_connection_id
    ON public.step_contacts(network_connection_id);

COMMENT ON COLUMN public.step_contacts.network_connection_id IS 'Link to the corresponding network connection';
