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
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('[Research AI] Missing authorization header');
      return new Response(JSON.stringify({ success: false, error: 'Authentication required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    // Use ANON_KEY with user's auth header to respect RLS
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Verify user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('[Research AI] Invalid token:', authError?.message);
      return new Response(JSON.stringify({ success: false, error: 'Invalid authentication token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify user has medical_staff or admin role
    const { data: hasRole } = await supabase.rpc('has_role', {
      _user_id: user.id,
      _role: 'medical_staff'
    });
    
    const { data: isAdmin } = await supabase.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin'
    });

    if (!hasRole && !isAdmin) {
      console.error('[Research AI] User lacks required role:', user.id);
      return new Response(JSON.stringify({ success: false, error: 'Insufficient permissions. Medical staff or admin role required.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { action, query, context, options } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    let systemPrompt = '';
    let userPrompt = '';

    switch (action) {
      case 'semantic_search':
        // Now uses authenticated supabase client that respects RLS
        const internalResults = await searchInternalData(supabase, query);
        
        systemPrompt = `Tu es un moteur de recherche médical intelligent avec capacités de recherche sémantique avancée. Tu analyses les requêtes et synthétises les informations de manière exhaustive.

Réponds toujours en français avec une structure claire:
## 🔍 Résumé Exécutif
Synthèse en 2-3 phrases des résultats principaux.

## 📊 Données Internes
Analyse des résultats trouvés dans la base de données (patients, dossiers, calculs).

## 🌐 Sources Externes Recommandées
- **PubMed**: Termes de recherche suggérés et liens directs
- **WHO/OMS**: Recommandations et guidelines pertinents
- **ClinicalTrials.gov**: Essais cliniques en cours
- **Cochrane**: Revues systématiques disponibles

## 💡 Insights & Corrélations
Analyse des patterns et corrélations découvertes dans les données.

## 🔗 Recherches Connexes
5 suggestions de recherches complémentaires pour approfondir.`;

        userPrompt = `Recherche sémantique approfondie pour: "${query}"

Données internes trouvées:
${JSON.stringify(internalResults, null, 2)}

Fournis une synthèse complète avec analyse des corrélations et recommandations de sources médicales externes.`;
        break;

      case 'generate_hypothesis':
        const researchContext = options?.researchContext || 'general';
        const confidenceLevel = options?.confidenceLevel || 'medium';
        
        systemPrompt = `Tu es un assistant de recherche médicale de niveau doctoral, spécialisé dans la génération d'hypothèses scientifiques rigoureuses.

Analyse les données fournies et génère des hypothèses selon le format suivant:

## 🎯 Hypothèse Principale
Énoncé clair et testable de l'hypothèse.

## 📐 Justification Scientifique
- Mécanismes biologiques sous-jacents
- Preuves existantes dans la littérature
- Plausibilité selon les connaissances actuelles

## 🔬 Variables & Indicateurs
| Variable | Type | Mesure | Seuil |
|----------|------|--------|-------|
| ... | Indépendante/Dépendante | ... | ... |

## 📊 Corrélations Identifiées
Analyse des patterns et relations entre variables.

## 🧪 Protocole d'Investigation
1. Design d'étude recommandé
2. Population cible
3. Critères d'inclusion/exclusion
4. Endpoints primaires et secondaires
5. Analyse statistique suggérée

## ⚠️ Limites & Biais Potentiels
Points de vigilance méthodologiques.

## 📈 Score de Confiance
- Niveau: ${confidenceLevel}
- Justification détaillée

## 🔗 Hypothèses Secondaires
3-5 hypothèses dérivées à explorer.

Réponds en français avec rigueur scientifique.`;

        userPrompt = `Contexte de recherche: ${context || 'Analyse générale des données médicales'}
Type de recherche: ${researchContext}

Données à analyser:
${query}

Génère des hypothèses de recherche scientifiquement rigoureuses basées sur ces données.`;
        break;

      case 'analyze_trends':
        systemPrompt = `Tu es un analyste de données médicales expert en détection de tendances et patterns cliniques.

Structure ta réponse:

## 📈 Tendances Principales
### Tendance 1: [Nom]
- **Description**: ...
- **Magnitude**: ...
- **Période**: ...
- **Signification clinique**: ...

## 🔴 Anomalies Détectées
Points de données inhabituels nécessitant attention.

## 📊 Analyse Statistique
- Moyennes et médianes
- Déviations standards
- Corrélations significatives (p-value estimée)
- Tests statistiques recommandés

## 🎯 Segments & Clusters
Groupes identifiés dans les données.

## ⚡ Alertes & Signaux
Points nécessitant action immédiate ou surveillance.

## 📋 Recommandations Actionnables
Actions concrètes basées sur l'analyse.

## 🔮 Projections
Évolution attendue si tendances actuelles persistent.

Réponds en français avec précision analytique.`;

        userPrompt = `Analyse les tendances et patterns dans ces données médicales:
${query}

${context ? `Contexte additionnel: ${context}` : ''}`;
        break;

      case 'literature_review':
        const reviewType = options?.reviewType || 'narrative';
        
        systemPrompt = `Tu es un expert en revue de littérature médicale avec accès aux principales bases de données scientifiques.

Structure ta revue systématique:

## 📚 État de l'Art
Synthèse des connaissances actuelles sur le sujet.

## 🏆 Études Clés
| Auteurs | Année | Journal | N | Design | Résultats principaux |
|---------|-------|---------|---|--------|---------------------|
| ... | ... | ... | ... | ... | ... |

## 📊 Méta-Analyse Narrative
- Consensus scientifique actuel
- Taille d'effet globale estimée
- Hétérogénéité des résultats

## ⚔️ Controverses & Débats
Points de désaccord dans la communauté scientifique.

## 🕳️ Lacunes Identifiées
Questions de recherche non résolues.

## 🔗 Références Essentielles
1. [Auteur et al., Année] - Journal - DOI/PMID
2. ...

## 📖 Guidelines & Recommandations
- Sociétés savantes: ...
- OMS: ...
- HAS/NICE: ...

## 💡 Orientations Futures
Directions de recherche prometteuses.

Fournis des références précises (PubMed, NEJM, Lancet, JAMA, BMJ) avec PMID quand possible.
Type de revue: ${reviewType}
Réponds en français.`;

        userPrompt = `Revue de littérature exhaustive sur: ${query}

${context ? `Focus particulier: ${context}` : ''}`;
        break;

      case 'cross_correlation':
        systemPrompt = `Tu es un expert en analyse de corrélations croisées et découverte de relations dans les données médicales.

Structure ton analyse:

## 🔄 Matrice de Corrélation
Analyse des relations entre toutes les variables.

## 🎯 Corrélations Fortes (r > 0.7)
| Variable A | Variable B | r | p-value | Interprétation |
|------------|------------|---|---------|----------------|

## ⚠️ Corrélations Modérées (0.4 < r < 0.7)
Relations méritant investigation.

## 🔍 Corrélations Inverses
Relations négatives significatives.

## 🧬 Causalité vs Corrélation
Analyse critique des relations observées.

## 🌐 Réseau de Relations
Visualisation conceptuelle des interconnexions.

## 💡 Découvertes Inattendues
Corrélations surprenantes méritant exploration.

Réponds en français.`;

        userPrompt = `Analyse les corrélations croisées dans ces données:
${query}

Identifie toutes les relations significatives entre variables.`;
        break;

      case 'clinical_synthesis':
        systemPrompt = `Tu es un expert en synthèse clinique capable d'intégrer données patient, littérature et guidelines.

Structure ta synthèse:

## 👤 Profil Patient
Résumé des caractéristiques clés.

## 🩺 Évaluation Clinique
- Diagnostic principal probable
- Diagnostics différentiels
- Score de sévérité

## 📊 Evidence-Based Analysis
Intégration des données avec la littérature.

## 💊 Recommandations Thérapeutiques
Basées sur les guidelines actuelles.

## ⚠️ Points de Vigilance
Risques et contre-indications.

## 📋 Plan de Suivi
Monitoring et étapes suivantes.

Réponds en français avec précision clinique.`;

        userPrompt = `Synthèse clinique pour:
${query}

${context ? `Contexte: ${context}` : ''}`;
        break;

      default:
        throw new Error(`Action non reconnue: ${action}`);
    }

    console.log(`Research AI action: ${action}, User: ${user.id}`);

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
    appointments: [],
    correlations: []
  };

  const searchTerms = query.toLowerCase().split(' ').filter(t => t.length > 2);

  // Search patients with semantic matching - RLS will restrict access
  const { data: patients } = await supabase
    .from('patients')
    .select('id, first_name, last_name, blood_type, allergies, gender, date_of_birth')
    .limit(20);

  if (patients) {
    results.patients = patients.filter((p: any) => {
      const searchStr = `${p.first_name} ${p.last_name} ${p.blood_type || ''} ${(p.allergies || []).join(' ')} ${p.gender || ''}`.toLowerCase();
      return searchTerms.some(term => searchStr.includes(term));
    }).slice(0, 10);
  }

  // Search medical records with expanded fields - RLS will restrict access
  const { data: records } = await supabase
    .from('medical_records')
    .select('id, diagnosis, symptoms, treatment, prescription, record_date, notes, record_type')
    .order('record_date', { ascending: false })
    .limit(50);

  if (records) {
    results.medical_records = records.filter((r: any) => {
      const searchStr = `${r.diagnosis || ''} ${(r.symptoms || []).join(' ')} ${r.treatment || ''} ${r.prescription || ''} ${r.notes || ''} ${r.record_type || ''}`.toLowerCase();
      return searchTerms.some(term => searchStr.includes(term));
    }).slice(0, 10);
  }

  // Search calculations with AI interpretations - RLS will restrict access
  const { data: calculations } = await supabase
    .from('medical_calculations')
    .select('id, calculation_type, result, ai_interpretation, created_at, input_data')
    .order('created_at', { ascending: false })
    .limit(30);

  if (calculations) {
    results.calculations = calculations.filter((c: any) => {
      const searchStr = `${c.calculation_type} ${c.ai_interpretation || ''} ${JSON.stringify(c.input_data || {})}`.toLowerCase();
      return searchTerms.some(term => searchStr.includes(term));
    }).slice(0, 10);
  }

  // Get appointments for context - RLS will restrict access
  const { data: appointments } = await supabase
    .from('appointments')
    .select('id, type, status, notes, appointment_date, location')
    .order('appointment_date', { ascending: false })
    .limit(20);

  if (appointments) {
    results.appointments = appointments.filter((a: any) => {
      const searchStr = `${a.type} ${a.notes || ''} ${a.location || ''}`.toLowerCase();
      return searchTerms.some(term => searchStr.includes(term));
    }).slice(0, 10);
  }

  // Compute basic correlations
  if (results.medical_records.length > 0) {
    const diagnosisCounts: Record<string, number> = {};
    const symptomCounts: Record<string, number> = {};
    
    results.medical_records.forEach((r: any) => {
      if (r.diagnosis) {
        diagnosisCounts[r.diagnosis] = (diagnosisCounts[r.diagnosis] || 0) + 1;
      }
      (r.symptoms || []).forEach((s: string) => {
        symptomCounts[s] = (symptomCounts[s] || 0) + 1;
      });
    });

    results.correlations = {
      topDiagnoses: Object.entries(diagnosisCounts).sort((a, b) => b[1] - a[1]).slice(0, 5),
      topSymptoms: Object.entries(symptomCounts).sort((a, b) => b[1] - a[1]).slice(0, 5),
      totalRecords: results.medical_records.length
    };
  }

  return results;
}
