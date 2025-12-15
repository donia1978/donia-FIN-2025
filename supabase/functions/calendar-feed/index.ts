import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get('user_id');
    const token = url.searchParams.get('token');

    if (!userId || !token) {
      return new Response('Missing user_id or token', { status: 400 });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify token using secure token from database
    const { data: calendarToken, error: tokenError } = await supabase
      .from('calendar_tokens')
      .select('*')
      .eq('user_id', userId)
      .eq('token', token)
      .eq('is_active', true)
      .gte('expires_at', new Date().toISOString())
      .single();

    // Fallback to legacy token generation if no calendar_tokens table exists
    if (tokenError) {
      const expectedToken = await generateLegacyToken(userId);
      if (token !== expectedToken) {
        return new Response('Invalid token', { status: 401 });
      }
    } else if (!calendarToken) {
      return new Response('Invalid or expired calendar token', { status: 401 });
    }

    // Update last_used_at if token exists in DB
    if (calendarToken) {
      await supabase
        .from('calendar_tokens')
        .update({ last_used_at: new Date().toISOString() })
        .eq('id', calendarToken.id);
    }

    // Fetch appointments for the user (as doctor)
    const { data: appointments, error } = await supabase
      .from('appointments')
      .select(`
        *,
        patient:patients(id, first_name, last_name)
      `)
      .eq('doctor_id', userId)
      .gte('appointment_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) // Last 30 days
      .order('appointment_date', { ascending: true });

    if (error) {
      console.error('Error fetching appointments:', error);
      throw error;
    }

    // Generate iCal content with minimal PHI
    const icalContent = generateICalendar(appointments || [], userId);

    return new Response(icalContent, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': 'attachment; filename="donia-appointments.ics"',
      },
    });
  } catch (err) {
    console.error('Calendar feed error:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Legacy token generation for backwards compatibility
async function generateLegacyToken(userId: string): Promise<string> {
  const secret = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const encoder = new TextEncoder();
  const data = encoder.encode(userId + secret.substring(0, 32));
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.slice(0, 16).map(b => b.toString(16).padStart(2, '0')).join('');
}

function generateICalendar(appointments: any[], userId: string): string {
  const now = new Date();
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//DONIA Medical//Calendar Feed//FR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:DONIA - Rendez-vous Médicaux',
    'X-WR-TIMEZONE:Europe/Paris',
  ];

  for (const apt of appointments) {
    const startDate = new Date(apt.appointment_date);
    const endDate = new Date(startDate.getTime() + (apt.duration_minutes || 30) * 60 * 1000);
    
    // Use patient reference instead of full name for privacy
    const patientRef = apt.patient?.id 
      ? `Réf: ${apt.patient.id.slice(-8).toUpperCase()}`
      : 'Patient';

    const uid = `${apt.id}@donia.medical`;
    const dtstamp = formatDateTimeUTC(now);
    const dtstart = formatDateTimeUTC(startDate);
    const dtend = formatDateTimeUTC(endDate);

    // Minimal PHI in calendar - only appointment type and reference
    const summary = escapeICalText(`RDV ${getAppointmentTypeLabel(apt.type)} - ${patientRef}`);
    const description = escapeICalText(
      `Type: ${getAppointmentTypeLabel(apt.type)}\\n` +
      `Durée: ${apt.duration_minutes || 30} min\\n` +
      `Statut: ${getStatusLabel(apt.status)}\\n\\n` +
      `⚕️ Connectez-vous au portail DONIA pour les détails patient\\n` +
      `🔒 Information médicale protégée`
    );
    const location = escapeICalText(apt.location || 'Voir portail DONIA');

    // Status color based on appointment status
    const categories = apt.status === 'confirmed' ? 'CONFIRMED' : 
                       apt.status === 'cancelled' ? 'CANCELLED' : 'SCHEDULED';

    lines.push(
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART:${dtstart}`,
      `DTEND:${dtend}`,
      `SUMMARY:${summary}`,
      `DESCRIPTION:${description}`,
      `LOCATION:${location}`,
      `CATEGORIES:${categories}`,
      `STATUS:${apt.status === 'cancelled' ? 'CANCELLED' : 'CONFIRMED'}`,
      'BEGIN:VALARM',
      'TRIGGER:-PT1H',
      'ACTION:DISPLAY',
      `DESCRIPTION:Rappel: ${summary}`,
      'END:VALARM',
      'BEGIN:VALARM',
      'TRIGGER:-PT15M',
      'ACTION:DISPLAY',
      `DESCRIPTION:Dans 15 minutes: ${summary}`,
      'END:VALARM',
      'END:VEVENT'
    );
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

function formatDateTimeUTC(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

function escapeICalText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

function getAppointmentTypeLabel(type: string): string {
  const types: Record<string, string> = {
    'consultation': 'Consultation',
    'follow_up': 'Suivi',
    'examination': 'Examen',
    'vaccination': 'Vaccination',
    'surgery': 'Chirurgie',
    'emergency': 'Urgence',
  };
  return types[type] || type;
}

function getStatusLabel(status: string): string {
  const statuses: Record<string, string> = {
    'scheduled': 'Planifié',
    'confirmed': 'Confirmé',
    'completed': 'Terminé',
    'cancelled': 'Annulé',
    'no_show': 'Absent',
  };
  return statuses[status] || status;
}
