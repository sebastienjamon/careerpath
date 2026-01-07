-- Create highlight_attachments table for files and document links
CREATE TABLE public.highlight_attachments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    highlight_id UUID NOT NULL REFERENCES public.career_highlights(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size INTEGER NOT NULL DEFAULT 0,
    file_url TEXT NOT NULL,
    storage_path TEXT,
    link_url TEXT,
    link_type TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX idx_highlight_attachments_highlight_id ON public.highlight_attachments(highlight_id);

-- RLS policies
ALTER TABLE public.highlight_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own highlight attachments"
    ON public.highlight_attachments FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own highlight attachments"
    ON public.highlight_attachments FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own highlight attachments"
    ON public.highlight_attachments FOR DELETE
    USING (auth.uid() = user_id);

COMMENT ON TABLE public.highlight_attachments IS 'Files and document links attached to career highlights';
COMMENT ON COLUMN public.highlight_attachments.link_url IS 'External link URL (Google Drive, Dropbox, etc.)';
COMMENT ON COLUMN public.highlight_attachments.link_type IS 'Type of external link (google_doc, dropbox, notion, etc.)';
