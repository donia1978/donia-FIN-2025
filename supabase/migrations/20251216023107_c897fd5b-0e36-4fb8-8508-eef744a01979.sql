-- Table pour les ressources éducatives
CREATE TABLE public.educational_resources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  resource_type TEXT NOT NULL DEFAULT 'lesson_plan', -- 'exam', 'lesson_plan', 'unit_plan', 'exercise', 'other'
  subject TEXT NOT NULL, -- 'math', 'french', 'arabic', 'science', 'history', etc.
  grade_level TEXT NOT NULL, -- '1ere_primaire', '2eme_primaire', ... '9eme_base', 'bac'
  trimester TEXT, -- '1', '2', '3'
  content TEXT, -- Parsed text content from PDF
  pdf_url TEXT, -- URL to stored PDF
  original_filename TEXT,
  tags TEXT[] DEFAULT '{}',
  author_id UUID REFERENCES auth.users(id),
  author_name TEXT,
  is_approved BOOLEAN DEFAULT false,
  downloads_count INTEGER DEFAULT 0,
  likes_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.educational_resources ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can view approved resources"
ON public.educational_resources FOR SELECT
USING (is_approved = true OR author_id = auth.uid());

CREATE POLICY "Authenticated users can create resources"
ON public.educational_resources FOR INSERT
WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Authors can update their resources"
ON public.educational_resources FOR UPDATE
USING (auth.uid() = author_id);

CREATE POLICY "Admins can manage all resources"
ON public.educational_resources FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Index for search
CREATE INDEX idx_educational_resources_search ON public.educational_resources 
USING gin(to_tsvector('french', coalesce(title, '') || ' ' || coalesce(description, '') || ' ' || coalesce(content, '')));

CREATE INDEX idx_educational_resources_filters ON public.educational_resources(subject, grade_level, resource_type);

-- Trigger for updated_at
CREATE TRIGGER update_educational_resources_updated_at
BEFORE UPDATE ON public.educational_resources
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();