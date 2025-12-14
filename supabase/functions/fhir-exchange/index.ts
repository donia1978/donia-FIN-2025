import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// FHIR R4 Resource builders
const buildFHIRPatient = (patient: any): object => ({
  resourceType: "Patient",
  id: patient.id,
  meta: {
    versionId: "1",
    lastUpdated: patient.updated_at
  },
  identifier: [{
    system: "urn:donia:patient",
    value: patient.id
  }],
  name: [{
    use: "official",
    family: patient.last_name,
    given: [patient.first_name]
  }],
  gender: patient.gender === 'M' ? 'male' : patient.gender === 'F' ? 'female' : 'unknown',
  birthDate: patient.date_of_birth,
  telecom: [
    patient.phone && { system: "phone", value: patient.phone, use: "mobile" },
    patient.email && { system: "email", value: patient.email }
  ].filter(Boolean),
  address: patient.address ? [{
    use: "home",
    text: patient.address
  }] : undefined
});

const buildFHIRObservation = (record: any, patient: any): object => ({
  resourceType: "Observation",
  id: record.id,
  status: "final",
  category: [{
    coding: [{
      system: "http://terminology.hl7.org/CodeSystem/observation-category",
      code: "exam",
      display: "Exam"
    }]
  }],
  subject: {
    reference: `Patient/${patient.id}`,
    display: `${patient.first_name} ${patient.last_name}`
  },
  effectiveDateTime: record.record_date,
  note: record.notes ? [{ text: record.notes }] : undefined,
  component: record.symptoms?.map((symptom: string) => ({
    code: {
      text: symptom
    }
  }))
});

const buildFHIRDiagnosticReport = (record: any, patient: any): object => ({
  resourceType: "DiagnosticReport",
  id: record.id,
  status: "final",
  category: [{
    coding: [{
      system: "http://terminology.hl7.org/CodeSystem/v2-0074",
      code: "RAD",
      display: "Radiology"
    }]
  }],
  subject: {
    reference: `Patient/${patient.id}`,
    display: `${patient.first_name} ${patient.last_name}`
  },
  effectiveDateTime: record.record_date,
  conclusion: record.diagnosis
});

const buildFHIRMedicationRequest = (suggestion: any, patient: any): object => ({
  resourceType: "MedicationRequest",
  id: suggestion.id,
  status: suggestion.status === 'validated' ? 'active' : 'draft',
  intent: "order",
  subject: patient ? {
    reference: `Patient/${patient.id}`,
    display: `${patient.first_name} ${patient.last_name}`
  } : undefined,
  authoredOn: suggestion.created_at,
  note: [{ text: suggestion.ai_suggestion }],
  reasonCode: suggestion.diagnosis ? [{
    text: suggestion.diagnosis
  }] : undefined
});

const buildFHIRBundle = (resources: object[], bundleType: string = "collection"): object => ({
  resourceType: "Bundle",
  id: crypto.randomUUID(),
  type: bundleType,
  timestamp: new Date().toISOString(),
  total: resources.length,
  entry: resources.map(resource => ({
    fullUrl: `urn:uuid:${(resource as any).id}`,
    resource
  }))
});

// HL7 v2.x message builder (simplified ADT^A01)
const buildHL7Message = (patient: any, messageType: string = "ADT^A01"): string => {
  const now = new Date();
  const timestamp = now.toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
  const messageId = crypto.randomUUID().replace(/-/g, '').slice(0, 20);
  
  const segments = [
    `MSH|^~\\&|DONIA|DONIA_FACILITY|RECEIVING_APP|RECEIVING_FACILITY|${timestamp}||${messageType}|${messageId}|P|2.5`,
    `EVN|A01|${timestamp}`,
    `PID|1||${patient.id}^^^DONIA||${patient.last_name}^${patient.first_name}||${patient.date_of_birth?.replace(/-/g, '')}|${patient.gender || 'U'}|||${patient.address || ''}||${patient.phone || ''}||||||||||||||`,
  ];
  
  return segments.join('\r');
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { action, patientId, facilityId, exchangeType, format } = await req.json();
    console.log(`FHIR Exchange: action=${action}, patientId=${patientId}, format=${format}`);

    // Get patient data
    const { data: patient, error: patientError } = await supabase
      .from('patients')
      .select('*')
      .eq('id', patientId)
      .single();

    if (patientError || !patient) {
      throw new Error(`Patient not found: ${patientError?.message}`);
    }

    let result: any = {};

    switch (action) {
      case 'export_patient': {
        // Build FHIR Patient resource
        const fhirPatient = buildFHIRPatient(patient);
        
        // Get medical records
        const { data: records } = await supabase
          .from('medical_records')
          .select('*')
          .eq('patient_id', patientId);

        // Get prescriptions
        const { data: prescriptions } = await supabase
          .from('ai_prescription_suggestions')
          .select('*')
          .eq('patient_id', patientId)
          .eq('status', 'validated');

        // Build FHIR resources
        const resources: object[] = [fhirPatient];
        
        records?.forEach(record => {
          if (record.record_type === 'consultation') {
            resources.push(buildFHIRObservation(record, patient));
          } else {
            resources.push(buildFHIRDiagnosticReport(record, patient));
          }
        });

        prescriptions?.forEach(prescription => {
          resources.push(buildFHIRMedicationRequest(prescription, patient));
        });

        const fhirBundle = buildFHIRBundle(resources, "document");
        const hl7Message = format === 'hl7' ? buildHL7Message(patient) : null;

        result = {
          fhir: fhirBundle,
          hl7: hl7Message,
          resourceCount: resources.length
        };
        break;
      }

      case 'send_to_facility': {
        // Check consent
        const { data: consent } = await supabase
          .from('patient_sharing_consents')
          .select('*')
          .eq('patient_id', patientId)
          .eq('facility_id', facilityId)
          .is('revoked_at', null)
          .single();

        if (!consent) {
          throw new Error('No valid consent for this facility');
        }

        // Get facility
        const { data: facility } = await supabase
          .from('healthcare_facilities')
          .select('*')
          .eq('id', facilityId)
          .single();

        if (!facility) {
          throw new Error('Facility not found');
        }

        // Build FHIR bundle
        const fhirPatient = buildFHIRPatient(patient);
        const { data: records } = await supabase
          .from('medical_records')
          .select('*')
          .eq('patient_id', patientId);

        const resources: object[] = [fhirPatient];
        records?.forEach(record => {
          resources.push(buildFHIRObservation(record, patient));
        });

        const fhirBundle = buildFHIRBundle(resources, "message");

        // Create exchange record
        const authHeader = req.headers.get('Authorization');
        const token = authHeader?.replace('Bearer ', '');
        const { data: { user } } = await supabase.auth.getUser(token);

        const { data: exchange, error: exchangeError } = await supabase
          .from('medical_data_exchanges')
          .insert({
            patient_id: patientId,
            destination_facility_id: facilityId,
            exchange_type: exchangeType || 'patient_summary',
            fhir_resource_type: 'Bundle',
            fhir_bundle: fhirBundle,
            hl7_message: buildHL7Message(patient),
            status: 'pending',
            created_by: user?.id
          })
          .select()
          .single();

        if (exchangeError) {
          throw new Error(`Failed to create exchange: ${exchangeError.message}`);
        }

        // Log audit
        await supabase.from('medical_data_audit_log').insert({
          patient_id: patientId,
          user_id: user?.id,
          facility_id: facilityId,
          action: 'share',
          resource_type: 'Bundle',
          resource_id: exchange.id,
          details: { exchange_type: exchangeType, resource_count: resources.length }
        });

        result = {
          exchangeId: exchange.id,
          status: 'pending',
          facility: facility.name,
          resourceCount: resources.length
        };
        break;
      }

      case 'get_exchanges': {
        const { data: exchanges } = await supabase
          .from('medical_data_exchanges')
          .select(`
            *,
            source_facility:source_facility_id(name, type),
            destination_facility:destination_facility_id(name, type)
          `)
          .eq('patient_id', patientId)
          .order('created_at', { ascending: false });

        result = { exchanges };
        break;
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('FHIR Exchange error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});