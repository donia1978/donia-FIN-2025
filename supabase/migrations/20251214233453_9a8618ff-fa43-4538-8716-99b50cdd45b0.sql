-- Améliorer la table des consentements avec signature électronique
ALTER TABLE public.patient_sharing_consents 
  ADD COLUMN IF NOT EXISTS signature_data TEXT, -- Signature base64
  ADD COLUMN IF NOT EXISTS signature_ip TEXT,
  ADD COLUMN IF NOT EXISTS signature_user_agent TEXT,
  ADD COLUMN IF NOT EXISTS consent_text TEXT,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMP WITH TIME ZONE;

-- Table pour les modèles de consentement
CREATE TABLE public.consent_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general', -- general, treatment, data_sharing, research
  content TEXT NOT NULL, -- Contenu du consentement en markdown
  version TEXT NOT NULL DEFAULT '1.0',
  is_mandatory BOOLEAN DEFAULT false,
  validity_days INTEGER DEFAULT 365, -- Durée de validité en jours
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table pour les consentements signés par les patients
CREATE TABLE public.patient_consents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES public.consent_templates(id),
  consent_text TEXT NOT NULL, -- Snapshot du texte au moment de la signature
  signature_data TEXT NOT NULL, -- Signature électronique base64
  signature_hash TEXT, -- Hash de vérification
  signed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  revoked_at TIMESTAMP WITH TIME ZONE,
  revocation_reason TEXT,
  ip_address TEXT,
  user_agent TEXT,
  witness_id UUID, -- ID du médecin témoin
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index pour les requêtes de consentements expirés
CREATE INDEX idx_patient_consents_expires_at ON public.patient_consents(expires_at) WHERE revoked_at IS NULL;
CREATE INDEX idx_patient_consents_patient_id ON public.patient_consents(patient_id);

-- Enable RLS
ALTER TABLE public.consent_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_consents ENABLE ROW LEVEL SECURITY;

-- Policies for consent_templates
CREATE POLICY "Anyone can view active templates" ON public.consent_templates
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage templates" ON public.consent_templates
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Policies for patient_consents
CREATE POLICY "Medical staff can view consents" ON public.patient_consents
  FOR SELECT USING (has_role(auth.uid(), 'medical_staff') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Medical staff can create consents" ON public.patient_consents
  FOR INSERT WITH CHECK (
    auth.uid() = created_by AND 
    (has_role(auth.uid(), 'medical_staff') OR has_role(auth.uid(), 'admin'))
  );

CREATE POLICY "Medical staff can update consents" ON public.patient_consents
  FOR UPDATE USING (has_role(auth.uid(), 'medical_staff') OR has_role(auth.uid(), 'admin'));

-- Trigger pour updated_at
CREATE TRIGGER update_consent_templates_updated_at
  BEFORE UPDATE ON public.consent_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insérer des modèles de consentement par défaut
INSERT INTO public.consent_templates (name, category, content, version, is_mandatory, validity_days) VALUES
('Consentement aux soins', 'treatment', 
'## Consentement aux soins médicaux

Je soussigné(e), patient(e) identifié(e) ci-dessous, déclare avoir été informé(e) de manière claire et compréhensible :

1. **De la nature et du déroulement des soins** proposés
2. **Des bénéfices attendus** et des risques éventuels
3. **Des alternatives thérapeutiques** disponibles
4. **De mon droit de refuser** ou d''interrompre le traitement à tout moment

Je consens librement à recevoir les soins médicaux proposés par l''équipe soignante.

*Ce consentement est valable pour une durée d''un an.*', 
'1.0', true, 365),

('Partage de données médicales', 'data_sharing',
'## Consentement au partage de données médicales

Je soussigné(e) autorise le partage de mes données médicales avec les établissements de santé partenaires, dans le respect du RGPD et du secret médical.

### Données concernées :
- Antécédents médicaux
- Résultats d''examens
- Prescriptions médicales
- Comptes-rendus de consultation

### Finalités :
- Continuité des soins
- Coordination entre professionnels de santé
- Amélioration de ma prise en charge

Je peux révoquer ce consentement à tout moment.', 
'1.0', false, 365),

('Participation à la recherche', 'research',
'## Consentement à la participation à des recherches médicales

Je consens à ce que mes données médicales anonymisées soient utilisées à des fins de recherche scientifique.

### Garanties :
- Anonymisation complète des données
- Aucune identification possible
- Droit de retrait à tout moment
- Aucun impact sur ma prise en charge

*Cette autorisation est valable pour une durée de 5 ans.*', 
'1.0', false, 1825),

('Téléconsultation', 'treatment',
'## Consentement à la téléconsultation

Je consens à participer à des consultations médicales à distance (téléconsultation) et j''ai été informé(e) :

1. Des modalités techniques de la téléconsultation
2. Des garanties de confidentialité et de sécurité des échanges
3. De mon droit d''interrompre la téléconsultation à tout moment
4. Que certaines situations peuvent nécessiter une consultation en présentiel

*Ce consentement est valable pour une durée de 2 ans.*', 
'1.0', false, 730);