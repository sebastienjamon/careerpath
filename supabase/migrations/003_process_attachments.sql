-- Create process_attachments table for storing document references
CREATE TABLE IF NOT EXISTS process_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  process_id UUID NOT NULL REFERENCES recruitment_processes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_url TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE process_attachments ENABLE ROW LEVEL SECURITY;

-- Users can view their own attachments
CREATE POLICY "Users can view own attachments"
  ON process_attachments FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own attachments
CREATE POLICY "Users can insert own attachments"
  ON process_attachments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own attachments
CREATE POLICY "Users can delete own attachments"
  ON process_attachments FOR DELETE
  USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_process_attachments_process_id ON process_attachments(process_id);
