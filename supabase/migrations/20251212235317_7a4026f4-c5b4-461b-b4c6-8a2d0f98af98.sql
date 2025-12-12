-- =============================================
-- COURSES MODULE - Tables
-- =============================================

-- Courses table
CREATE TABLE public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  instructor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  instructor_name TEXT,
  category TEXT DEFAULT 'general',
  difficulty TEXT DEFAULT 'beginner',
  duration_hours INTEGER DEFAULT 0,
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Lessons table
CREATE TABLE public.lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  video_url TEXT,
  content TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  duration_minutes INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Quizzes table
CREATE TABLE public.quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  passing_score INTEGER DEFAULT 70,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Quiz questions table
CREATE TABLE public.quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  options JSONB NOT NULL DEFAULT '[]',
  correct_answer INTEGER NOT NULL DEFAULT 0,
  order_index INTEGER NOT NULL DEFAULT 0
);

-- User course enrollments
CREATE TABLE public.enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  UNIQUE(user_id, course_id)
);

-- User lesson progress
CREATE TABLE public.lesson_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  completed BOOLEAN DEFAULT false,
  progress_percent INTEGER DEFAULT 0,
  completed_at TIMESTAMPTZ,
  UNIQUE(user_id, lesson_id)
);

-- Quiz attempts
CREATE TABLE public.quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  score INTEGER NOT NULL DEFAULT 0,
  passed BOOLEAN DEFAULT false,
  answers JSONB DEFAULT '[]',
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- Enable RLS
-- =============================================
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS Policies
-- =============================================

-- Courses: everyone can view published courses
CREATE POLICY "Anyone can view published courses"
  ON public.courses FOR SELECT
  TO authenticated
  USING (is_published = true OR instructor_id = auth.uid());

-- Instructors can manage their courses
CREATE POLICY "Instructors can manage their courses"
  ON public.courses FOR ALL
  TO authenticated
  USING (instructor_id = auth.uid());

-- Lessons: viewable if course is published or user is instructor
CREATE POLICY "View lessons of accessible courses"
  ON public.lessons FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.courses c 
      WHERE c.id = course_id 
      AND (c.is_published = true OR c.instructor_id = auth.uid())
    )
  );

-- Quizzes: viewable if lesson is accessible
CREATE POLICY "View quizzes of accessible lessons"
  ON public.quizzes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.lessons l 
      JOIN public.courses c ON c.id = l.course_id
      WHERE l.id = lesson_id 
      AND (c.is_published = true OR c.instructor_id = auth.uid())
    )
  );

-- Quiz questions: viewable if quiz is accessible
CREATE POLICY "View quiz questions"
  ON public.quiz_questions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.quizzes q 
      JOIN public.lessons l ON l.id = q.lesson_id
      JOIN public.courses c ON c.id = l.course_id
      WHERE q.id = quiz_id 
      AND (c.is_published = true OR c.instructor_id = auth.uid())
    )
  );

-- Enrollments: users manage their own
CREATE POLICY "Users can view their enrollments"
  ON public.enrollments FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can enroll themselves"
  ON public.enrollments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Lesson progress: users manage their own
CREATE POLICY "Users can view their lesson progress"
  ON public.lesson_progress FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their lesson progress"
  ON public.lesson_progress FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can modify their lesson progress"
  ON public.lesson_progress FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Quiz attempts: users manage their own
CREATE POLICY "Users can view their quiz attempts"
  ON public.quiz_attempts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create quiz attempts"
  ON public.quiz_attempts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- =============================================
-- Triggers
-- =============================================
CREATE TRIGGER update_courses_updated_at
  BEFORE UPDATE ON public.courses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();