-- Store Google Calendar OAuth tokens
CREATE TABLE public.google_calendar_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    token_expires_at TIMESTAMPTZ NOT NULL,
    scope TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Index for quick lookups
CREATE INDEX idx_google_calendar_tokens_user_id ON public.google_calendar_tokens(user_id);

-- Enable RLS
ALTER TABLE public.google_calendar_tokens ENABLE ROW LEVEL SECURITY;

-- Users can only access their own tokens
CREATE POLICY "Users can view their own calendar tokens" ON public.google_calendar_tokens
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own calendar tokens" ON public.google_calendar_tokens
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own calendar tokens" ON public.google_calendar_tokens
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own calendar tokens" ON public.google_calendar_tokens
    FOR DELETE USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_google_calendar_tokens_updated_at
    BEFORE UPDATE ON public.google_calendar_tokens
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add calendar event link columns to process_steps
ALTER TABLE public.process_steps
    ADD COLUMN IF NOT EXISTS google_calendar_event_id TEXT,
    ADD COLUMN IF NOT EXISTS google_calendar_event_summary TEXT;

-- Index for calendar event lookups
CREATE INDEX IF NOT EXISTS idx_process_steps_calendar_event ON public.process_steps(google_calendar_event_id);
