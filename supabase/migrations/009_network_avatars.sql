-- Add avatar and email fields to network_connections
ALTER TABLE public.network_connections
    ADD COLUMN IF NOT EXISTS email TEXT,
    ADD COLUMN IF NOT EXISTS avatar_url TEXT;

COMMENT ON COLUMN public.network_connections.email IS 'Contact email - used for fetching avatar via unavatar.io';
COMMENT ON COLUMN public.network_connections.avatar_url IS 'Direct URL to contact avatar image';
