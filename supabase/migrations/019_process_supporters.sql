-- Create process_supporters table to link network contacts as supporters for recruitment processes
CREATE TABLE public.process_supporters (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    process_id UUID REFERENCES public.recruitment_processes(id) ON DELETE CASCADE NOT NULL,
    network_connection_id UUID REFERENCES public.network_connections(id) ON DELETE CASCADE NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Ensure a contact can only be added once per process
    UNIQUE(process_id, network_connection_id)
);

-- Enable RLS
ALTER TABLE public.process_supporters ENABLE ROW LEVEL SECURITY;

-- RLS policy: Users can only access supporters for their own processes
CREATE POLICY "Users can manage supporters for own processes"
    ON public.process_supporters FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.recruitment_processes
            WHERE id = process_supporters.process_id
            AND user_id = auth.uid()
        )
    );

-- Index for faster lookups
CREATE INDEX idx_process_supporters_process_id ON public.process_supporters(process_id);
CREATE INDEX idx_process_supporters_network_id ON public.process_supporters(network_connection_id);

COMMENT ON TABLE public.process_supporters IS 'Links network contacts as supporters helping the user during recruitment processes';
COMMENT ON COLUMN public.process_supporters.notes IS 'Optional notes about how this contact is helping (e.g., "Internal referral", "Mock interview practice")';
