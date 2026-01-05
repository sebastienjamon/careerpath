-- Add company_website column to career_experiences for logo display
ALTER TABLE career_experiences
ADD COLUMN IF NOT EXISTS company_website TEXT;

-- Add company_website column to recruitment_processes for logo display
ALTER TABLE recruitment_processes
ADD COLUMN IF NOT EXISTS company_website TEXT;
