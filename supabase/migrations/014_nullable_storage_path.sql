-- Make storage_path nullable to support document links (which don't have storage)
ALTER TABLE public.step_attachments
    ALTER COLUMN storage_path DROP NOT NULL;

ALTER TABLE public.process_attachments
    ALTER COLUMN storage_path DROP NOT NULL;
