-- Create patients table for medical records
CREATE TABLE public.patients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  date_of_birth DATE,
  gender TEXT,
  blood_type TEXT,
  allergies TEXT[],
  phone TEXT,
  email TEXT,
  address TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create medical records table
CREATE TABLE public.medical_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL,
  record_type TEXT NOT NULL DEFAULT 'consultation',
  diagnosis TEXT,
  symptoms TEXT[],
  treatment TEXT,
  prescription TEXT,
  notes TEXT,
  attachments TEXT[],
  record_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create appointments table
CREATE TABLE public.appointments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL,
  appointment_date TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_minutes INTEGER DEFAULT 30,
  status TEXT NOT NULL DEFAULT 'scheduled',
  type TEXT NOT NULL DEFAULT 'consultation',
  notes TEXT,
  location TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create social posts table
CREATE TABLE public.social_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  media_urls TEXT[],
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  shares_count INTEGER DEFAULT 0,
  visibility TEXT DEFAULT 'public',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create social comments table
CREATE TABLE public.social_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.social_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create social likes table
CREATE TABLE public.social_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.social_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id)
);

-- Enable RLS on all tables
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_likes ENABLE ROW LEVEL SECURITY;

-- Patients policies (medical staff and admins can manage)
CREATE POLICY "Medical staff can view patients" ON public.patients
  FOR SELECT USING (
    has_role(auth.uid(), 'medical_staff') OR has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Medical staff can create patients" ON public.patients
  FOR INSERT WITH CHECK (
    has_role(auth.uid(), 'medical_staff') OR has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Medical staff can update patients" ON public.patients
  FOR UPDATE USING (
    has_role(auth.uid(), 'medical_staff') OR has_role(auth.uid(), 'admin')
  );

-- Medical records policies
CREATE POLICY "Medical staff can view records" ON public.medical_records
  FOR SELECT USING (
    has_role(auth.uid(), 'medical_staff') OR has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Doctors can create records" ON public.medical_records
  FOR INSERT WITH CHECK (
    auth.uid() = doctor_id AND (has_role(auth.uid(), 'medical_staff') OR has_role(auth.uid(), 'admin'))
  );

CREATE POLICY "Doctors can update their records" ON public.medical_records
  FOR UPDATE USING (
    auth.uid() = doctor_id
  );

-- Appointments policies
CREATE POLICY "Medical staff can view appointments" ON public.appointments
  FOR SELECT USING (
    has_role(auth.uid(), 'medical_staff') OR has_role(auth.uid(), 'admin') OR auth.uid() = doctor_id
  );

CREATE POLICY "Medical staff can create appointments" ON public.appointments
  FOR INSERT WITH CHECK (
    has_role(auth.uid(), 'medical_staff') OR has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Medical staff can update appointments" ON public.appointments
  FOR UPDATE USING (
    has_role(auth.uid(), 'medical_staff') OR has_role(auth.uid(), 'admin') OR auth.uid() = doctor_id
  );

CREATE POLICY "Medical staff can delete appointments" ON public.appointments
  FOR DELETE USING (
    has_role(auth.uid(), 'medical_staff') OR has_role(auth.uid(), 'admin')
  );

-- Social posts policies (public viewing, users manage their own)
CREATE POLICY "Anyone can view public posts" ON public.social_posts
  FOR SELECT USING (visibility = 'public' OR auth.uid() = user_id);

CREATE POLICY "Users can create posts" ON public.social_posts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their posts" ON public.social_posts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their posts" ON public.social_posts
  FOR DELETE USING (auth.uid() = user_id);

-- Social comments policies
CREATE POLICY "Anyone can view comments" ON public.social_comments
  FOR SELECT USING (true);

CREATE POLICY "Users can create comments" ON public.social_comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their comments" ON public.social_comments
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their comments" ON public.social_comments
  FOR DELETE USING (auth.uid() = user_id);

-- Social likes policies
CREATE POLICY "Anyone can view likes" ON public.social_likes
  FOR SELECT USING (true);

CREATE POLICY "Users can like posts" ON public.social_likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike posts" ON public.social_likes
  FOR DELETE USING (auth.uid() = user_id);

-- Triggers for updated_at
CREATE TRIGGER update_patients_updated_at
  BEFORE UPDATE ON public.patients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_medical_records_updated_at
  BEFORE UPDATE ON public.medical_records
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_appointments_updated_at
  BEFORE UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_social_posts_updated_at
  BEFORE UPDATE ON public.social_posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_social_comments_updated_at
  BEFORE UPDATE ON public.social_comments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();