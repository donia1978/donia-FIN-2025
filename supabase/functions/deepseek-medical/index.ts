import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const DEEPSEEK_API_KEY = Deno.env.get('DEEPSEEK_API_KEY');
    if (!DEEPSEEK_API_KEY) {
      console.error('DEEPSEEK_API_KEY is not configured');
      throw new Error('DEEPSEEK_API_KEY is not configured');
    }

    const { action, data } = await req.json();
    console.log(`[DeepSeek Medical] Action: ${action}`, JSON.stringify(data));

    let systemPrompt = '';
    let userPrompt = '';

    switch (action) {
      case 'generate_prescription':
        systemPrompt = `Tu es un assistant médical expert. Tu dois générer des suggestions de prescription basées sur les symptômes et le diagnostic fournis. 
        IMPORTANT: Ceci est une SUGGESTION qui doit être validée par un médecin humain. 
        Tu dois toujours inclure des avertissements appropriés et ne jamais remplacer l'avis médical professionnel.
        Réponds en français.`;
        userPrompt = `Patient: ${data.patientName}
Symptômes: ${data.symptoms?.join(', ') || 'Non spécifiés'}
Diagnostic: ${data.diagnosis || 'Non spécifié'}
Pays: ${data.country || 'France'}
Allergies connues: ${data.allergies?.join(', ') || 'Aucune connue'}

Génère une suggestion de prescription adaptée, en tenant compte de la disponibilité des médicaments dans le pays du patient.`;
        break;

      case 'calculate_medical_indicator':
        systemPrompt = `Tu es un calculateur médical expert. Tu dois calculer les indicateurs médicaux demandés avec précision.
        Fournis toujours les formules utilisées, les valeurs normales de référence, et l'interprétation du résultat.
        Réponds en français avec un format structuré.`;
        userPrompt = `Calcul demandé: ${data.calculationType}
Données patient: ${JSON.stringify(data.patientData)}

Effectue le calcul et fournis:
1. La formule utilisée
2. Le résultat avec unités
3. Les valeurs normales de référence
4. L'interprétation du résultat`;
        break;

      case 'analyze_symptoms':
        systemPrompt = `Tu es un assistant médical pour l'analyse préliminaire des symptômes.
        Tu dois fournir des pistes de diagnostic différentiel basées sur les symptômes décrits.
        AVERTISSEMENT: Ceci n'est pas un diagnostic médical. Le patient doit consulter un professionnel de santé.
        Réponds en français.`;
        userPrompt = `Symptômes rapportés: ${data.symptoms?.join(', ')}
Durée: ${data.duration || 'Non spécifiée'}
Antécédents: ${data.medicalHistory || 'Non spécifiés'}

Fournis une analyse préliminaire avec des pistes de diagnostic différentiel.`;
        break;

      case 'appointment_reminder':
        systemPrompt = `Tu es un assistant de rappel de rendez-vous médical. Génère des messages de rappel professionnels et bienveillants en français.`;
        userPrompt = `Générer un rappel de rendez-vous:
Patient: ${data.patientName}
Médecin: ${data.doctorName}
Date: ${data.appointmentDate}
Heure: ${data.appointmentTime}
Type: ${data.appointmentType}
Lieu: ${data.location || 'Cabinet médical'}

Type de rappel: ${data.reminderType} (24h avant / 2h avant / 15 min avant)`;
        break;

      default:
        throw new Error(`Action non reconnue: ${action}`);
    }

    console.log('[DeepSeek Medical] Calling DeepSeek API...');
    
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[DeepSeek Medical] API Error:', response.status, errorText);
      throw new Error(`DeepSeek API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content;
    
    console.log('[DeepSeek Medical] Response received successfully');

    return new Response(JSON.stringify({ 
      success: true, 
      content,
      action,
      disclaimer: "Cette information est générée par IA et doit être validée par un professionnel de santé qualifié."
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[DeepSeek Medical] Error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Erreur inconnue' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
