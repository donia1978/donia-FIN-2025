-- Add notification preferences to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS notification_email BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS notification_sms BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS notification_push BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT false;

-- Create appointment reminders table
CREATE TABLE IF NOT EXISTS public.appointment_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  reminder_type TEXT NOT NULL DEFAULT '24h', -- 24h, 2h, 15min
  scheduled_at TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, sent, failed, cancelled
  channel TEXT NOT NULL DEFAULT 'push', -- push, email, sms
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create medical calculators history table
CREATE TABLE IF NOT EXISTS public.medical_calculations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL,
  doctor_id UUID NOT NULL,
  calculation_type TEXT NOT NULL, -- bmi, gfr, creatinine_clearance, wells_score, etc.
  input_data JSONB NOT NULL DEFAULT '{}',
  result JSONB NOT NULL DEFAULT '{}',
  ai_interpretation TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create AI prescription suggestions table (for audit trail)
CREATE TABLE IF NOT EXISTS public.ai_prescription_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL,
  doctor_id UUID NOT NULL,
  symptoms TEXT[],
  diagnosis TEXT,
  ai_suggestion TEXT NOT NULL,
  validated_by UUID, -- Doctor who validated
  validated_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, validated, rejected
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.appointment_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_calculations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_prescription_suggestions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for appointment_reminders
CREATE POLICY "Medical staff can view reminders" ON public.appointment_reminders
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM appointments a 
      WHERE a.id = appointment_reminders.appointment_id 
      AND (a.doctor_id = auth.uid() OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'medical_staff'))
    )
  );

CREATE POLICY "System can manage reminders" ON public.appointment_reminders
  FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'medical_staff'));

-- RLS Policies for medical_calculations
CREATE POLICY "Medical staff can view calculations" ON public.medical_calculations
  FOR SELECT USING (
    has_role(auth.uid(), 'medical_staff') OR has_role(auth.uid(), 'admin') OR doctor_id = auth.uid()
  );

CREATE POLICY "Medical staff can create calculations" ON public.medical_calculations
  FOR INSERT WITH CHECK (
    auth.uid() = doctor_id AND (has_role(auth.uid(), 'medical_staff') OR has_role(auth.uid(), 'admin'))
  );

-- RLS Policies for ai_prescription_suggestions
CREATE POLICY "Medical staff can view suggestions" ON public.ai_prescription_suggestions
  FOR SELECT USING (
    has_role(auth.uid(), 'medical_staff') OR has_role(auth.uid(), 'admin') OR doctor_id = auth.uid()
  );

CREATE POLICY "Medical staff can create suggestions" ON public.ai_prescription_suggestions
  FOR INSERT WITH CHECK (
    auth.uid() = doctor_id AND (has_role(auth.uid(), 'medical_staff') OR has_role(auth.uid(), 'admin'))
  );

CREATE POLICY "Medical staff can update suggestions" ON public.ai_prescription_suggestions
  FOR UPDATE USING (
    has_role(auth.uid(), 'medical_staff') OR has_role(auth.uid(), 'admin')
  );

-- Enable realtime for reminders
ALTER PUBLICATION supabase_realtime ADD TABLE public.appointment_reminders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;