import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
      console.error('[Statistics AI] Missing authorization header');
      return new Response(JSON.stringify({ success: false, error: 'Authentication required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Verify user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('[Statistics AI] Invalid token:', authError?.message);
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
      console.error('[Statistics AI] User lacks required role:', user.id);
      return new Response(JSON.stringify({ success: false, error: 'Insufficient permissions. Medical staff or admin role required.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { action, data, context } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    let systemPrompt = '';
    let userPrompt = '';

    switch (action) {
      case 'descriptive':
        systemPrompt = `Tu es un statisticien expert. Analyse les données fournies et calcule les statistiques descriptives.

Fournis:
1. Mesures de tendance centrale (moyenne, médiane, mode)
2. Mesures de dispersion (écart-type, variance, étendue, IQR)
3. Mesures de forme (asymétrie, kurtosis)
4. Quartiles et percentiles clés
5. Résumé des 5 nombres (min, Q1, médiane, Q3, max)
6. Interprétation clinique si applicable

Format les résultats de manière claire avec les valeurs numériques.
Réponds en français.`;

        userPrompt = `Analyse descriptive des données suivantes:
${JSON.stringify(data, null, 2)}

Contexte: ${context || 'Données médicales générales'}`;
        break;

      case 'inferential':
        systemPrompt = `Tu es un statisticien expert en inférence statistique. Analyse les données et effectue les tests appropriés.

Fournis:
1. Test d'hypothèse approprié (t-test, chi-carré, ANOVA, etc.)
2. Valeur p et interprétation
3. Intervalle de confiance à 95%
4. Taille d'effet (Cohen's d, r², etc.)
5. Puissance statistique estimée
6. Conclusion et recommandations

Explique le choix du test et les hypothèses vérifiées.
Réponds en français.`;

        userPrompt = `Analyse inférentielle des données:
${JSON.stringify(data, null, 2)}

Contexte: ${context || 'Comparaison de groupes'}`;
        break;

      case 'bayesian':
        systemPrompt = `Tu es un expert en statistiques bayésiennes. Effectue une analyse bayésienne des données.

Fournis:
1. Spécification du prior (justification du choix)
2. Vraisemblance du modèle
3. Distribution postérieure
4. Facteur de Bayes et interprétation
5. Intervalles de crédibilité (HDI 95%)
6. Comparaison avec l'approche fréquentiste
7. Probabilités postérieures des hypothèses

Explique l'interprétation bayésienne des résultats.
Réponds en français.`;

        userPrompt = `Analyse bayésienne des données:
${JSON.stringify(data, null, 2)}

Contexte: ${context || 'Analyse de probabilités'}`;
        break;

      case 'predictive':
        systemPrompt = `Tu es un expert en modélisation prédictive et machine learning médical.

Fournis:
1. Modèle de prédiction recommandé (régression, classification, etc.)
2. Variables prédictives importantes
3. Performance estimée (R², AUC, précision, sensibilité, spécificité)
4. Validation croisée et robustesse
5. Facteurs de risque identifiés
6. Prédictions pour les cas fournis
7. Limites et précautions d'utilisation

Recommande des améliorations possibles du modèle.
Réponds en français.`;

        userPrompt = `Modélisation prédictive pour:
${JSON.stringify(data, null, 2)}

Contexte: ${context || 'Prédiction de risque médical'}`;
        break;

      case 'correlation':
        systemPrompt = `Tu es un statisticien expert en analyse de corrélations.

Fournis:
1. Matrice de corrélation (Pearson et Spearman)
2. Significativité des corrélations
3. Corrélations partielles si pertinent
4. Multicolinéarité potentielle
5. Visualisation recommandée
6. Interprétation clinique des associations

Attention: corrélation n'implique pas causalité - mentionne-le.
Réponds en français.`;

        userPrompt = `Analyse de corrélation:
${JSON.stringify(data, null, 2)}

Contexte: ${context || 'Relations entre variables'}`;
        break;

      case 'survival':
        systemPrompt = `Tu es un expert en analyse de survie médicale.

Fournis:
1. Courbe de Kaplan-Meier (description)
2. Médiane de survie et intervalles de confiance
3. Test du log-rank pour comparaison de groupes
4. Hazard ratios (modèle de Cox)
5. Facteurs pronostiques
6. Survie à 1 an, 3 ans, 5 ans
7. Interprétation clinique

Réponds en français.`;

        userPrompt = `Analyse de survie:
${JSON.stringify(data, null, 2)}

Contexte: ${context || 'Étude de survie médicale'}`;
        break;

      default:
        throw new Error(`Action non reconnue: ${action}`);
    }

    console.log(`Statistics AI action: ${action}, User: ${user.id}`);

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
        return new Response(JSON.stringify({ error: 'Limite de requêtes atteinte.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Crédits insuffisants.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content;

    return new Response(JSON.stringify({ 
      success: true, 
      result: content,
      action 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Statistics AI error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Erreur inconnue' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
