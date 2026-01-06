-- Add support for document links (Google Drive, etc.) in step attachments
ALTER TABLE public.step_attachments
    ADD COLUMN IF NOT EXISTS link_url TEXT,
    ADD COLUMN IF NOT EXISTS link_type TEXT;

COMMENT ON COLUMN public.step_attachments.link_url IS 'External document URL (Google Drive, Dropbox, etc.)';
COMMENT ON COLUMN public.step_attachments.link_type IS 'Type of link: google_doc, google_sheet, google_slide, google_drive, dropbox, other';

-- Also add to process_attachments for consistency
ALTER TABLE public.process_attachments
    ADD COLUMN IF NOT EXISTS link_url TEXT,
    ADD COLUMN IF NOT EXISTS link_type TEXT;
