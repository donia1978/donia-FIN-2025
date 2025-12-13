import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, query, context } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let systemPrompt = '';
    let userPrompt = '';

    switch (action) {
      case 'semantic_search':
        // Search internal data
        const internalResults = await searchInternalData(supabase, query);
        
        systemPrompt = `Tu es un moteur de recherche médical intelligent. Tu analyses les requêtes de recherche et synthétises les informations pertinentes des sources internes et externes.

Réponds toujours en français avec une structure claire:
1. Résumé des résultats trouvés
2. Sources internes pertinentes (patients, dossiers, calculs)
3. Liens vers sources externes recommandées (PubMed, WHO)
4. Suggestions de recherches connexes`;

        userPrompt = `Recherche sémantique pour: "${query}"

Données internes trouvées:
${JSON.stringify(internalResults, null, 2)}

Fournis une synthèse des résultats avec recommandations de sources médicales externes (PubMed, OMS, etc.).`;
        break;

      case 'generate_hypothesis':
        systemPrompt = `Tu es un assistant de recherche médicale spécialisé dans la génération d'hypothèses scientifiques.

Analyse les données fournies et génère des hypothèses de recherche:
1. Identifie les corrélations potentielles
2. Suggère des pistes de recherche
3. Propose des méthodologies d'investigation
4. Estime la faisabilité et l'impact potentiel

Format de réponse:
- Hypothèse principale
- Justification basée sur les données
- Corrélations identifiées
- Pistes d'investigation recommandées
- Score de confiance (faible/moyen/élevé)

Réponds toujours en français.`;

        userPrompt = `Contexte de recherche: ${context || 'Analyse générale des données'}

Données à analyser:
${query}

Génère des hypothèses de recherche basées sur ces données.`;
        break;

      case 'analyze_trends':
        systemPrompt = `Tu es un analyste de données médicales. Analyse les tendances et patterns dans les données cliniques.

Structure ta réponse:
1. Tendances principales identifiées
2. Anomalies ou outliers
3. Corrélations statistiques potentielles
4. Recommandations d'actions

Réponds en français.`;

        userPrompt = `Analyse les tendances dans ces données médicales:
${query}`;
        break;

      case 'literature_review':
        systemPrompt = `Tu es un expert en revue de littérature médicale. Tu synthétises les connaissances actuelles sur un sujet donné.

Structure:
1. État de l'art
2. Études clés à consulter (noms, années, journaux)
3. Controverses et débats actuels
4. Lacunes dans la recherche
5. Recommandations pour approfondir

Fournis des références à PubMed, NEJM, Lancet, WHO quand pertinent.
Réponds en français.`;

        userPrompt = `Revue de littérature sur: ${query}`;
        break;

      default:
        throw new Error(`Action non reconnue: ${action}`);
    }

    console.log(`Research AI action: ${action}`);

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Limite de requêtes atteinte. Réessayez plus tard.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Crédits insuffisants. Ajoutez des crédits à votre workspace.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    return new Response(JSON.stringify({ 
      success: true, 
      result: content,
      action 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Research AI error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Erreur inconnue' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function searchInternalData(supabase: any, query: string) {
  const results: any = {
    patients: [],
    medical_records: [],
    calculations: [],
    appointments: []
  };

  const searchTerms = query.toLowerCase().split(' ').filter(t => t.length > 2);

  // Search patients
  const { data: patients } = await supabase
    .from('patients')
    .select('id, first_name, last_name, blood_type, allergies, gender')
    .limit(10);

  if (patients) {
    results.patients = patients.filter((p: any) => {
      const searchStr = `${p.first_name} ${p.last_name} ${p.blood_type || ''} ${(p.allergies || []).join(' ')}`.toLowerCase();
      return searchTerms.some(term => searchStr.includes(term));
    }).slice(0, 5);
  }

  // Search medical records
  const { data: records } = await supabase
    .from('medical_records')
    .select('id, diagnosis, symptoms, treatment, prescription, record_date')
    .order('record_date', { ascending: false })
    .limit(20);

  if (records) {
    results.medical_records = records.filter((r: any) => {
      const searchStr = `${r.diagnosis || ''} ${(r.symptoms || []).join(' ')} ${r.treatment || ''} ${r.prescription || ''}`.toLowerCase();
      return searchTerms.some(term => searchStr.includes(term));
    }).slice(0, 5);
  }

  // Search calculations
  const { data: calculations } = await supabase
    .from('medical_calculations')
    .select('id, calculation_type, result, ai_interpretation, created_at')
    .order('created_at', { ascending: false })
    .limit(20);

  if (calculations) {
    results.calculations = calculations.filter((c: any) => {
      const searchStr = `${c.calculation_type} ${c.ai_interpretation || ''}`.toLowerCase();
      return searchTerms.some(term => searchStr.includes(term));
    }).slice(0, 5);
  }

  // Get recent appointments for context
  const { data: appointments } = await supabase
    .from('appointments')
    .select('id, type, status, notes, appointment_date')
    .order('appointment_date', { ascending: false })
    .limit(10);

  if (appointments) {
    results.appointments = appointments.filter((a: any) => {
      const searchStr = `${a.type} ${a.notes || ''}`.toLowerCase();
      return searchTerms.some(term => searchStr.includes(term));
    }).slice(0, 5);
  }

  return results;
}
