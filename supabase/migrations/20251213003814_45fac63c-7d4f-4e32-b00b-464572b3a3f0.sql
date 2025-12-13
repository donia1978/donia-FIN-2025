-- Create SOS alerts table
CREATE TABLE public.sos_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'other',
  priority TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'pending',
  location TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  assigned_to UUID,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolution_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create SOS alert comments for tracking
CREATE TABLE public.sos_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  alert_id UUID NOT NULL REFERENCES public.sos_alerts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create SOS responders table
CREATE TABLE public.sos_responders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  specialty TEXT,
  is_available BOOLEAN DEFAULT true,
  current_location TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sos_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sos_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sos_responders ENABLE ROW LEVEL SECURITY;

-- SOS alerts policies
CREATE POLICY "Users can create SOS alerts" ON public.sos_alerts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own alerts" ON public.sos_alerts
  FOR SELECT USING (
    auth.uid() = user_id OR 
    auth.uid() = assigned_to OR 
    has_role(auth.uid(), 'admin') OR
    has_role(auth.uid(), 'medical_staff')
  );

CREATE POLICY "Staff can update alerts" ON public.sos_alerts
  FOR UPDATE USING (
    auth.uid() = assigned_to OR 
    has_role(auth.uid(), 'admin') OR
    has_role(auth.uid(), 'medical_staff')
  );

-- SOS comments policies
CREATE POLICY "View comments on accessible alerts" ON public.sos_comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.sos_alerts 
      WHERE id = alert_id AND (
        user_id = auth.uid() OR 
        assigned_to = auth.uid() OR 
        has_role(auth.uid(), 'admin') OR
        has_role(auth.uid(), 'medical_staff')
      )
    )
  );

CREATE POLICY "Add comments to accessible alerts" ON public.sos_comments
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.sos_alerts 
      WHERE id = alert_id AND (
        user_id = auth.uid() OR 
        assigned_to = auth.uid() OR 
        has_role(auth.uid(), 'admin') OR
        has_role(auth.uid(), 'medical_staff')
      )
    )
  );

-- SOS responders policies
CREATE POLICY "View responders" ON public.sos_responders
  FOR SELECT USING (
    has_role(auth.uid(), 'admin') OR
    has_role(auth.uid(), 'medical_staff') OR
    auth.uid() = user_id
  );

CREATE POLICY "Manage responders" ON public.sos_responders
  FOR ALL USING (
    has_role(auth.uid(), 'admin')
  );

-- Triggers
CREATE TRIGGER update_sos_alerts_updated_at
  BEFORE UPDATE ON public.sos_alerts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for SOS alerts
ALTER PUBLICATION supabase_realtime ADD TABLE public.sos_alerts;