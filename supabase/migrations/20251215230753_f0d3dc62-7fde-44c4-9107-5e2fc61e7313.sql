-- 1. Create doctor_patient_assignments table for proper access control
CREATE TABLE public.doctor_patient_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  assigned_by UUID,
  is_primary BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'transferred')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(doctor_id, patient_id)
);

-- Enable RLS
ALTER TABLE public.doctor_patient_assignments ENABLE ROW LEVEL SECURITY;

-- Policies for doctor_patient_assignments
CREATE POLICY "Admins can manage all assignments"
  ON public.doctor_patient_assignments
  FOR ALL
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Medical staff can view their assignments"
  ON public.doctor_patient_assignments
  FOR SELECT
  USING (doctor_id = auth.uid() OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Medical staff can create assignments"
  ON public.doctor_patient_assignments
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'medical_staff') OR has_role(auth.uid(), 'admin'));

-- 2. Create helper function to check doctor-patient relationship
CREATE OR REPLACE FUNCTION public.is_assigned_to_patient(_doctor_id uuid, _patient_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.doctor_patient_assignments
    WHERE doctor_id = _doctor_id
      AND patient_id = _patient_id
      AND status = 'active'
  )
$$;

-- 3. Update patients table RLS - restrict to assigned doctors only
DROP POLICY IF EXISTS "Medical staff can view patients" ON public.patients;
DROP POLICY IF EXISTS "Medical staff can update patients" ON public.patients;
DROP POLICY IF EXISTS "Medical staff can create patients" ON public.patients;

CREATE POLICY "Doctors can view assigned patients"
  ON public.patients
  FOR SELECT
  USING (
    has_role(auth.uid(), 'admin') 
    OR is_assigned_to_patient(auth.uid(), id)
    OR (has_role(auth.uid(), 'medical_staff') AND NOT EXISTS (
      SELECT 1 FROM doctor_patient_assignments WHERE patient_id = id
    ))
  );

CREATE POLICY "Doctors can update assigned patients"
  ON public.patients
  FOR UPDATE
  USING (
    has_role(auth.uid(), 'admin') 
    OR is_assigned_to_patient(auth.uid(), id)
  );

CREATE POLICY "Medical staff can create patients"
  ON public.patients
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'medical_staff') OR has_role(auth.uid(), 'admin'));

-- 4. Update medical_records RLS - restrict to assigned doctors
DROP POLICY IF EXISTS "Medical staff can view records" ON public.medical_records;
DROP POLICY IF EXISTS "Doctors can create records" ON public.medical_records;
DROP POLICY IF EXISTS "Doctors can update their records" ON public.medical_records;

CREATE POLICY "Doctors can view records of assigned patients"
  ON public.medical_records
  FOR SELECT
  USING (
    has_role(auth.uid(), 'admin')
    OR doctor_id = auth.uid()
    OR is_assigned_to_patient(auth.uid(), patient_id)
  );

CREATE POLICY "Doctors can create records for assigned patients"
  ON public.medical_records
  FOR INSERT
  WITH CHECK (
    auth.uid() = doctor_id 
    AND (
      has_role(auth.uid(), 'admin')
      OR is_assigned_to_patient(auth.uid(), patient_id)
    )
  );

CREATE POLICY "Doctors can update their own records"
  ON public.medical_records
  FOR UPDATE
  USING (auth.uid() = doctor_id);

-- 5. Update appointments RLS
DROP POLICY IF EXISTS "Medical staff can view appointments" ON public.appointments;
DROP POLICY IF EXISTS "Medical staff can create appointments" ON public.appointments;
DROP POLICY IF EXISTS "Medical staff can update appointments" ON public.appointments;
DROP POLICY IF EXISTS "Medical staff can delete appointments" ON public.appointments;

CREATE POLICY "Doctors can view appointments for assigned patients"
  ON public.appointments
  FOR SELECT
  USING (
    has_role(auth.uid(), 'admin')
    OR doctor_id = auth.uid()
    OR is_assigned_to_patient(auth.uid(), patient_id)
  );

CREATE POLICY "Medical staff can create appointments"
  ON public.appointments
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'medical_staff') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Doctors can update their appointments"
  ON public.appointments
  FOR UPDATE
  USING (
    has_role(auth.uid(), 'admin')
    OR doctor_id = auth.uid()
  );

CREATE POLICY "Doctors can delete their appointments"
  ON public.appointments
  FOR DELETE
  USING (has_role(auth.uid(), 'admin') OR doctor_id = auth.uid());

-- 6. Fix profiles table - restrict to own profile + create public view
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

CREATE POLICY "Users can view own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON public.profiles
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Medical staff can view profiles for messaging"
  ON public.profiles
  FOR SELECT
  USING (
    has_role(auth.uid(), 'medical_staff')
    AND EXISTS (
      SELECT 1 FROM conversation_participants cp1
      JOIN conversation_participants cp2 ON cp1.conversation_id = cp2.conversation_id
      WHERE cp1.user_id = auth.uid() AND cp2.user_id = profiles.id
    )
  );

-- 7. Create public_profiles view with minimal data for social features
CREATE OR REPLACE VIEW public.public_profiles AS
SELECT 
  id,
  full_name,
  avatar_url
FROM public.profiles;

-- Grant access to authenticated users
GRANT SELECT ON public.public_profiles TO authenticated;

-- 8. Add updated_at trigger for assignments table
CREATE TRIGGER update_doctor_patient_assignments_updated_at
  BEFORE UPDATE ON public.doctor_patient_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();