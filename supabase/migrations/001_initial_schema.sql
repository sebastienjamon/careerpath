-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase auth.users)
CREATE TABLE public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    linkedin_profile_url TEXT,
    linkedin_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Career experiences
CREATE TABLE public.career_experiences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    company_name TEXT NOT NULL,
    job_title TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    description TEXT,
    skills TEXT[] DEFAULT '{}',
    is_current BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Recruitment processes
CREATE TYPE process_status AS ENUM ('upcoming', 'in_progress', 'completed', 'rejected', 'offer_received', 'accepted');
CREATE TYPE process_source AS ENUM ('linkedin', 'referral', 'direct', 'other');

CREATE TABLE public.recruitment_processes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    company_name TEXT NOT NULL,
    job_title TEXT NOT NULL,
    job_url TEXT,
    status process_status DEFAULT 'upcoming',
    applied_date DATE,
    source process_source DEFAULT 'other',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Process steps
CREATE TYPE step_type AS ENUM ('phone_screen', 'technical', 'behavioral', 'onsite', 'offer', 'other');
CREATE TYPE step_status AS ENUM ('upcoming', 'completed', 'cancelled');

CREATE TABLE public.process_steps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    process_id UUID NOT NULL REFERENCES public.recruitment_processes(id) ON DELETE CASCADE,
    step_number INTEGER NOT NULL,
    step_type step_type DEFAULT 'other',
    scheduled_date TIMESTAMPTZ,
    status step_status DEFAULT 'upcoming',
    objectives TEXT[] DEFAULT '{}',
    notes TEXT,
    outcome TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step contacts (people met during interviews)
CREATE TABLE public.step_contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    step_id UUID NOT NULL REFERENCES public.process_steps(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    role TEXT,
    linkedin_url TEXT,
    email TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Network connections
CREATE TYPE relationship_strength AS ENUM ('strong', 'medium', 'weak');

CREATE TABLE public.network_connections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    linkedin_url TEXT,
    company TEXT,
    role TEXT,
    relationship_strength relationship_strength DEFAULT 'medium',
    can_help_with TEXT[] DEFAULT '{}',
    last_contacted DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Coaches
CREATE TYPE availability_status AS ENUM ('available', 'busy', 'unavailable');

CREATE TABLE public.coaches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    specialties TEXT[] DEFAULT '{}',
    hourly_rate DECIMAL(10,2) NOT NULL,
    bio TEXT,
    availability_status availability_status DEFAULT 'available',
    rating DECIMAL(3,2),
    stripe_account_id TEXT,
    stripe_onboarding_complete BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Coaching sessions
CREATE TYPE session_status AS ENUM ('pending', 'confirmed', 'completed', 'cancelled');
CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'refunded');

CREATE TABLE public.coaching_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    coach_id UUID NOT NULL REFERENCES public.coaches(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    step_id UUID REFERENCES public.process_steps(id) ON DELETE SET NULL,
    scheduled_at TIMESTAMPTZ NOT NULL,
    duration_minutes INTEGER NOT NULL,
    session_rate DECIMAL(10,2) NOT NULL,
    platform_fee DECIMAL(10,2) NOT NULL,
    status session_status DEFAULT 'pending',
    payment_status payment_status DEFAULT 'pending',
    stripe_payment_intent_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Coach reviews
CREATE TABLE public.coach_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    coach_id UUID NOT NULL REFERENCES public.coaches(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES public.coaching_sessions(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX idx_career_experiences_user_id ON public.career_experiences(user_id);
CREATE INDEX idx_recruitment_processes_user_id ON public.recruitment_processes(user_id);
CREATE INDEX idx_recruitment_processes_status ON public.recruitment_processes(status);
CREATE INDEX idx_process_steps_process_id ON public.process_steps(process_id);
CREATE INDEX idx_step_contacts_step_id ON public.step_contacts(step_id);
CREATE INDEX idx_network_connections_user_id ON public.network_connections(user_id);
CREATE INDEX idx_coaches_user_id ON public.coaches(user_id);
CREATE INDEX idx_coaching_sessions_coach_id ON public.coaching_sessions(coach_id);
CREATE INDEX idx_coaching_sessions_client_id ON public.coaching_sessions(client_id);
CREATE INDEX idx_coach_reviews_coach_id ON public.coach_reviews(coach_id);

-- Enable Row Level Security on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.career_experiences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recruitment_processes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.process_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.step_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.network_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coaches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coaching_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_reviews ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users
CREATE POLICY "Users can view their own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON public.users
    FOR INSERT WITH CHECK (auth.uid() = id);

-- RLS Policies for career_experiences
CREATE POLICY "Users can view their own experiences" ON public.career_experiences
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own experiences" ON public.career_experiences
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own experiences" ON public.career_experiences
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own experiences" ON public.career_experiences
    FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for recruitment_processes
CREATE POLICY "Users can view their own processes" ON public.recruitment_processes
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own processes" ON public.recruitment_processes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own processes" ON public.recruitment_processes
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own processes" ON public.recruitment_processes
    FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for process_steps (via process ownership)
CREATE POLICY "Users can view steps of their processes" ON public.process_steps
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.recruitment_processes rp
            WHERE rp.id = process_steps.process_id AND rp.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert steps to their processes" ON public.process_steps
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.recruitment_processes rp
            WHERE rp.id = process_steps.process_id AND rp.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update steps of their processes" ON public.process_steps
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.recruitment_processes rp
            WHERE rp.id = process_steps.process_id AND rp.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete steps of their processes" ON public.process_steps
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.recruitment_processes rp
            WHERE rp.id = process_steps.process_id AND rp.user_id = auth.uid()
        )
    );

-- RLS Policies for step_contacts (via process->step ownership)
CREATE POLICY "Users can view contacts of their steps" ON public.step_contacts
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.process_steps ps
            JOIN public.recruitment_processes rp ON rp.id = ps.process_id
            WHERE ps.id = step_contacts.step_id AND rp.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert contacts to their steps" ON public.step_contacts
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.process_steps ps
            JOIN public.recruitment_processes rp ON rp.id = ps.process_id
            WHERE ps.id = step_contacts.step_id AND rp.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update contacts of their steps" ON public.step_contacts
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.process_steps ps
            JOIN public.recruitment_processes rp ON rp.id = ps.process_id
            WHERE ps.id = step_contacts.step_id AND rp.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete contacts of their steps" ON public.step_contacts
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.process_steps ps
            JOIN public.recruitment_processes rp ON rp.id = ps.process_id
            WHERE ps.id = step_contacts.step_id AND rp.user_id = auth.uid()
        )
    );

-- RLS Policies for network_connections
CREATE POLICY "Users can view their own connections" ON public.network_connections
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own connections" ON public.network_connections
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own connections" ON public.network_connections
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own connections" ON public.network_connections
    FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for coaches
CREATE POLICY "Anyone can view available coaches" ON public.coaches
    FOR SELECT USING (availability_status = 'available' OR user_id = auth.uid());

CREATE POLICY "Users can create their coach profile" ON public.coaches
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Coaches can update their own profile" ON public.coaches
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Coaches can delete their own profile" ON public.coaches
    FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for coaching_sessions
CREATE POLICY "Users can view their sessions (as coach or client)" ON public.coaching_sessions
    FOR SELECT USING (
        auth.uid() = client_id OR
        EXISTS (
            SELECT 1 FROM public.coaches c
            WHERE c.id = coaching_sessions.coach_id AND c.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create sessions as client" ON public.coaching_sessions
    FOR INSERT WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Participants can update sessions" ON public.coaching_sessions
    FOR UPDATE USING (
        auth.uid() = client_id OR
        EXISTS (
            SELECT 1 FROM public.coaches c
            WHERE c.id = coaching_sessions.coach_id AND c.user_id = auth.uid()
        )
    );

-- RLS Policies for coach_reviews
CREATE POLICY "Anyone can view coach reviews" ON public.coach_reviews
    FOR SELECT USING (true);

CREATE POLICY "Clients can create reviews for completed sessions" ON public.coach_reviews
    FOR INSERT WITH CHECK (
        auth.uid() = reviewer_id AND
        EXISTS (
            SELECT 1 FROM public.coaching_sessions cs
            WHERE cs.id = coach_reviews.session_id
            AND cs.client_id = auth.uid()
            AND cs.status = 'completed'
        )
    );

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, full_name, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'avatar_url'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create user profile on signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_career_experiences_updated_at BEFORE UPDATE ON public.career_experiences
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_recruitment_processes_updated_at BEFORE UPDATE ON public.recruitment_processes
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_process_steps_updated_at BEFORE UPDATE ON public.process_steps
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_network_connections_updated_at BEFORE UPDATE ON public.network_connections
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_coaches_updated_at BEFORE UPDATE ON public.coaches
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_coaching_sessions_updated_at BEFORE UPDATE ON public.coaching_sessions
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
