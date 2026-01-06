-- Add company_website field to network_connections for company logos
ALTER TABLE public.network_connections
    ADD COLUMN IF NOT EXISTS company_website TEXT;

COMMENT ON COLUMN public.network_connections.company_website IS 'Company website URL used to fetch company logo favicon';
