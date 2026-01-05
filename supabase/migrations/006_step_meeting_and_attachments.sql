-- Add meeting_url to process_steps for video conference links
ALTER TABLE public.process_steps
    ADD COLUMN IF NOT EXISTS meeting_url TEXT;

-- Create step_attachments table for storing document references at step level
CREATE TABLE IF NOT EXISTS step_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  step_id UUID NOT NULL REFERENCES process_steps(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_url TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE step_attachments ENABLE ROW LEVEL SECURITY;

-- Users can view their own step attachments
CREATE POLICY "Users can view own step attachments"
  ON step_attachments FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own step attachments
CREATE POLICY "Users can insert own step attachments"
  ON step_attachments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own step attachments
CREATE POLICY "Users can delete own step attachments"
  ON step_attachments FOR DELETE
  USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_step_attachments_step_id ON step_attachments(step_id);
