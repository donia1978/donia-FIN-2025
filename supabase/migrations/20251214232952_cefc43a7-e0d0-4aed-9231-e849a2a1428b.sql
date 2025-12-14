-- Table pour les établissements de santé partenaires
CREATE TABLE public.healthcare_facilities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'hospital', -- hospital, clinic, laboratory, pharmacy, imaging_center
  address TEXT,
  city TEXT,
  country TEXT DEFAULT 'FR',
  phone TEXT,
  email TEXT,
  fhir_endpoint TEXT, -- URL FHIR de l'établissement
  hl7_identifier TEXT, -- Identifiant HL7
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table pour les échanges de données médicales inter-établissements
CREATE TABLE public.medical_data_exchanges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID REFERENCES public.patients(id),
  source_facility_id UUID REFERENCES public.healthcare_facilities(id),
  destination_facility_id UUID REFERENCES public.healthcare_facilities(id),
  exchange_type TEXT NOT NULL DEFAULT 'patient_summary', -- patient_summary, lab_results, imaging, prescription, referral
  fhir_resource_type TEXT, -- Patient, Observation, DiagnosticReport, MedicationRequest, etc.
  fhir_bundle JSONB, -- Bundle FHIR complet
  hl7_message TEXT, -- Message HL7 v2.x si applicable
  status TEXT NOT NULL DEFAULT 'pending', -- pending, sent, received, acknowledged, failed
  sent_at TIMESTAMP WITH TIME ZONE,
  received_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL
);

-- Table pour les autorisations de partage patient
CREATE TABLE public.patient_sharing_consents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES public.patients(id),
  facility_id UUID NOT NULL REFERENCES public.healthcare_facilities(id),
  consent_type TEXT NOT NULL DEFAULT 'full', -- full, limited, emergency_only
  data_types TEXT[] DEFAULT ARRAY['all'], -- Quels types de données peuvent être partagés
  granted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  revoked_at TIMESTAMP WITH TIME ZONE,
  granted_by UUID NOT NULL,
  UNIQUE(patient_id, facility_id)
);

-- Table pour l'audit des accès aux données médicales
CREATE TABLE public.medical_data_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID REFERENCES public.patients(id),
  user_id UUID NOT NULL,
  facility_id UUID REFERENCES public.healthcare_facilities(id),
  action TEXT NOT NULL, -- view, export, share, receive
  resource_type TEXT, -- Type de ressource accédée
  resource_id UUID,
  ip_address TEXT,
  user_agent TEXT,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.healthcare_facilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_data_exchanges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_sharing_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_data_audit_log ENABLE ROW LEVEL SECURITY;

-- Policies for healthcare_facilities
CREATE POLICY "Medical staff can view facilities" ON public.healthcare_facilities
  FOR SELECT USING (has_role(auth.uid(), 'medical_staff') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage facilities" ON public.healthcare_facilities
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Policies for medical_data_exchanges
CREATE POLICY "Medical staff can view exchanges" ON public.medical_data_exchanges
  FOR SELECT USING (has_role(auth.uid(), 'medical_staff') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Medical staff can create exchanges" ON public.medical_data_exchanges
  FOR INSERT WITH CHECK (
    auth.uid() = created_by AND 
    (has_role(auth.uid(), 'medical_staff') OR has_role(auth.uid(), 'admin'))
  );

CREATE POLICY "Medical staff can update exchanges" ON public.medical_data_exchanges
  FOR UPDATE USING (has_role(auth.uid(), 'medical_staff') OR has_role(auth.uid(), 'admin'));

-- Policies for patient_sharing_consents
CREATE POLICY "Medical staff can view consents" ON public.patient_sharing_consents
  FOR SELECT USING (has_role(auth.uid(), 'medical_staff') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Medical staff can manage consents" ON public.patient_sharing_consents
  FOR ALL USING (has_role(auth.uid(), 'medical_staff') OR has_role(auth.uid(), 'admin'));

-- Policies for audit log
CREATE POLICY "Medical staff can view audit logs" ON public.medical_data_audit_log
  FOR SELECT USING (has_role(auth.uid(), 'medical_staff') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert audit logs" ON public.medical_data_audit_log
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Triggers for updated_at
CREATE TRIGGER update_healthcare_facilities_updated_at
  BEFORE UPDATE ON public.healthcare_facilities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();