-- Create career_highlights table for STAR model achievements
CREATE TABLE public.career_highlights (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    career_experience_id UUID REFERENCES public.career_experiences(id) ON DELETE SET NULL,

    -- Basic info
    company_name TEXT NOT NULL,
    company_website TEXT,
    title TEXT NOT NULL,
    achievement_date DATE,

    -- STAR model fields
    situation TEXT NOT NULL,
    task TEXT NOT NULL,
    action TEXT NOT NULL,
    result TEXT NOT NULL,

    -- AI-generated tags (array of strings)
    tags TEXT[] DEFAULT '{}',

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_highlight_categories table for custom tag management
CREATE TABLE public.user_highlight_categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, name)
);

-- RLS policies
ALTER TABLE public.career_highlights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_highlight_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own highlights"
    ON public.career_highlights FOR ALL
    USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own categories"
    ON public.user_highlight_categories FOR ALL
    USING (auth.uid() = user_id);

-- Update trigger for career_highlights
CREATE TRIGGER update_career_highlights_updated_at
    BEFORE UPDATE ON public.career_highlights
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE public.career_highlights IS 'Career achievements using STAR model for interview preparation';
COMMENT ON COLUMN public.career_highlights.situation IS 'STAR: Context and background of the achievement';
COMMENT ON COLUMN public.career_highlights.task IS 'STAR: What was required or the challenge faced';
COMMENT ON COLUMN public.career_highlights.action IS 'STAR: Specific actions taken';
COMMENT ON COLUMN public.career_highlights.result IS 'STAR: Measurable outcomes and impact';
COMMENT ON COLUMN public.career_highlights.tags IS 'AI-generated category tags for filtering';
