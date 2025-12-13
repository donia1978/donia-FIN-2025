import { CalculatorDefinition, CalculatorResult } from './types';

export const psychiatryCalculators: CalculatorDefinition[] = [
  {
    id: 'phq9',
    name: 'PHQ-9',
    description: 'Dépistage et suivi de la dépression',
    category: 'psychiatry',
    fields: [
      {
        id: 'q1', label: 'Peu d\'intérêt ou de plaisir à faire les choses', type: 'select',
        options: [
          { value: '0', label: 'Pas du tout' },
          { value: '1', label: 'Plusieurs jours' },
          { value: '2', label: 'Plus de la moitié du temps' },
          { value: '3', label: 'Presque tous les jours' }
        ]
      },
      {
        id: 'q2', label: 'Se sentir triste, déprimé(e) ou désespéré(e)', type: 'select',
        options: [
          { value: '0', label: 'Pas du tout' },
          { value: '1', label: 'Plusieurs jours' },
          { value: '2', label: 'Plus de la moitié du temps' },
          { value: '3', label: 'Presque tous les jours' }
        ]
      },
      {
        id: 'q3', label: 'Troubles du sommeil', type: 'select',
        options: [
          { value: '0', label: 'Pas du tout' },
          { value: '1', label: 'Plusieurs jours' },
          { value: '2', label: 'Plus de la moitié du temps' },
          { value: '3', label: 'Presque tous les jours' }
        ]
      },
      {
        id: 'q4', label: 'Se sentir fatigué(e) ou manquer d\'énergie', type: 'select',
        options: [
          { value: '0', label: 'Pas du tout' },
          { value: '1', label: 'Plusieurs jours' },
          { value: '2', label: 'Plus de la moitié du temps' },
          { value: '3', label: 'Presque tous les jours' }
        ]
      },
      {
        id: 'q5', label: 'Perte d\'appétit ou manger trop', type: 'select',
        options: [
          { value: '0', label: 'Pas du tout' },
          { value: '1', label: 'Plusieurs jours' },
          { value: '2', label: 'Plus de la moitié du temps' },
          { value: '3', label: 'Presque tous les jours' }
        ]
      },
      {
        id: 'q6', label: 'Mauvaise estime de soi', type: 'select',
        options: [
          { value: '0', label: 'Pas du tout' },
          { value: '1', label: 'Plusieurs jours' },
          { value: '2', label: 'Plus de la moitié du temps' },
          { value: '3', label: 'Presque tous les jours' }
        ]
      },
      {
        id: 'q7', label: 'Difficultés de concentration', type: 'select',
        options: [
          { value: '0', label: 'Pas du tout' },
          { value: '1', label: 'Plusieurs jours' },
          { value: '2', label: 'Plus de la moitié du temps' },
          { value: '3', label: 'Presque tous les jours' }
        ]
      },
      {
        id: 'q8', label: 'Ralentissement ou agitation psychomotrice', type: 'select',
        options: [
          { value: '0', label: 'Pas du tout' },
          { value: '1', label: 'Plusieurs jours' },
          { value: '2', label: 'Plus de la moitié du temps' },
          { value: '3', label: 'Presque tous les jours' }
        ]
      },
      {
        id: 'q9', label: 'Idées suicidaires ou d\'automutilation', type: 'select',
        options: [
          { value: '0', label: 'Pas du tout' },
          { value: '1', label: 'Plusieurs jours' },
          { value: '2', label: 'Plus de la moitié du temps' },
          { value: '3', label: 'Presque tous les jours' }
        ]
      }
    ],
    calculate: (inputs): CalculatorResult => {
      let total = 0;
      for (let i = 1; i <= 9; i++) {
        total += parseInt(inputs[`q${i}`] || '0');
      }
      
      let interpretation = '';
      let severity: 'low' | 'normal' | 'high' | 'critical' = 'normal';
      
      if (total <= 4) {
        interpretation = 'Dépression minimale ou absente';
        severity = 'normal';
      } else if (total <= 9) {
        interpretation = 'Dépression légère';
        severity = 'low';
      } else if (total <= 14) {
        interpretation = 'Dépression modérée - Traitement à considérer';
        severity = 'high';
      } else if (total <= 19) {
        interpretation = 'Dépression modérément sévère - Traitement recommandé';
        severity = 'critical';
      } else {
        interpretation = 'Dépression sévère - Traitement immédiat requis';
        severity = 'critical';
      }
      
      // Alert for suicidal ideation
      if (parseInt(inputs.q9 || '0') > 0) {
        interpretation += ' ⚠️ ÉVALUATION RISQUE SUICIDAIRE REQUISE';
        severity = 'critical';
      }
      
      return {
        value: total,
        unit: '/27',
        interpretation,
        normalRange: '0-4',
        severity
      };
    }
  },
  {
    id: 'gad7',
    name: 'GAD-7',
    description: 'Dépistage et suivi de l\'anxiété',
    category: 'psychiatry',
    fields: [
      {
        id: 'q1', label: 'Sentiment de nervosité, d\'anxiété ou de tension', type: 'select',
        options: [
          { value: '0', label: 'Pas du tout' },
          { value: '1', label: 'Plusieurs jours' },
          { value: '2', label: 'Plus de la moitié du temps' },
          { value: '3', label: 'Presque tous les jours' }
        ]
      },
      {
        id: 'q2', label: 'Incapacité à arrêter ou contrôler les inquiétudes', type: 'select',
        options: [
          { value: '0', label: 'Pas du tout' },
          { value: '1', label: 'Plusieurs jours' },
          { value: '2', label: 'Plus de la moitié du temps' },
          { value: '3', label: 'Presque tous les jours' }
        ]
      },
      {
        id: 'q3', label: 'Inquiétudes excessives pour différentes choses', type: 'select',
        options: [
          { value: '0', label: 'Pas du tout' },
          { value: '1', label: 'Plusieurs jours' },
          { value: '2', label: 'Plus de la moitié du temps' },
          { value: '3', label: 'Presque tous les jours' }
        ]
      },
      {
        id: 'q4', label: 'Difficultés à se détendre', type: 'select',
        options: [
          { value: '0', label: 'Pas du tout' },
          { value: '1', label: 'Plusieurs jours' },
          { value: '2', label: 'Plus de la moitié du temps' },
          { value: '3', label: 'Presque tous les jours' }
        ]
      },
      {
        id: 'q5', label: 'Agitation, impossibilité de tenir en place', type: 'select',
        options: [
          { value: '0', label: 'Pas du tout' },
          { value: '1', label: 'Plusieurs jours' },
          { value: '2', label: 'Plus de la moitié du temps' },
          { value: '3', label: 'Presque tous les jours' }
        ]
      },
      {
        id: 'q6', label: 'Tendance à s\'énerver ou à être irritable', type: 'select',
        options: [
          { value: '0', label: 'Pas du tout' },
          { value: '1', label: 'Plusieurs jours' },
          { value: '2', label: 'Plus de la moitié du temps' },
          { value: '3', label: 'Presque tous les jours' }
        ]
      },
      {
        id: 'q7', label: 'Peur que quelque chose de terrible puisse arriver', type: 'select',
        options: [
          { value: '0', label: 'Pas du tout' },
          { value: '1', label: 'Plusieurs jours' },
          { value: '2', label: 'Plus de la moitié du temps' },
          { value: '3', label: 'Presque tous les jours' }
        ]
      }
    ],
    calculate: (inputs): CalculatorResult => {
      let total = 0;
      for (let i = 1; i <= 7; i++) {
        total += parseInt(inputs[`q${i}`] || '0');
      }
      
      let interpretation = '';
      let severity: 'low' | 'normal' | 'high' | 'critical' = 'normal';
      
      if (total <= 4) {
        interpretation = 'Anxiété minimale ou absente';
        severity = 'normal';
      } else if (total <= 9) {
        interpretation = 'Anxiété légère - Surveillance recommandée';
        severity = 'low';
      } else if (total <= 14) {
        interpretation = 'Anxiété modérée - Traitement à considérer';
        severity = 'high';
      } else {
        interpretation = 'Anxiété sévère - Traitement recommandé';
        severity = 'critical';
      }
      
      return {
        value: total,
        unit: '/21',
        interpretation,
        normalRange: '0-4',
        severity
      };
    }
  },
  {
    id: 'hamilton',
    name: 'Échelle de Hamilton (dépression)',
    description: 'HAM-D - Sévérité de la dépression',
    category: 'psychiatry',
    fields: [
      {
        id: 'depressed_mood', label: 'Humeur dépressive (0-4)', type: 'select',
        options: [
          { value: '0', label: '0 - Absente' },
          { value: '1', label: '1 - Sentiments évoqués seulement si on l\'interroge' },
          { value: '2', label: '2 - Sentiments spontanément rapportés' },
          { value: '3', label: '3 - Sentiments non verbaux (expression faciale, voix)' },
          { value: '4', label: '4 - Sentiments pratiquement les seuls rapportés' }
        ]
      },
      {
        id: 'guilt', label: 'Sentiments de culpabilité (0-4)', type: 'select',
        options: [
          { value: '0', label: '0 - Absents' },
          { value: '1', label: '1 - Auto-reproches' },
          { value: '2', label: '2 - Idées de culpabilité' },
          { value: '3', label: '3 - La maladie est une punition' },
          { value: '4', label: '4 - Hallucinations accusatrices' }
        ]
      },
      {
        id: 'suicide', label: 'Suicide (0-4)', type: 'select',
        options: [
          { value: '0', label: '0 - Absent' },
          { value: '1', label: '1 - La vie ne vaut pas la peine d\'être vécue' },
          { value: '2', label: '2 - Souhaite être mort' },
          { value: '3', label: '3 - Idées ou gestes suicidaires' },
          { value: '4', label: '4 - Tentative de suicide' }
        ]
      },
      {
        id: 'insomnia_early', label: 'Insomnie d\'endormissement (0-2)', type: 'select',
        options: [
          { value: '0', label: '0 - Absente' },
          { value: '1', label: '1 - Plaintes occasionnelles' },
          { value: '2', label: '2 - Plaintes chaque nuit' }
        ]
      },
      {
        id: 'insomnia_middle', label: 'Insomnie du milieu de nuit (0-2)', type: 'select',
        options: [
          { value: '0', label: '0 - Absente' },
          { value: '1', label: '1 - Agitation et troubles' },
          { value: '2', label: '2 - Se réveille pendant la nuit' }
        ]
      },
      {
        id: 'insomnia_late', label: 'Insomnie du matin (0-2)', type: 'select',
        options: [
          { value: '0', label: '0 - Absente' },
          { value: '1', label: '1 - Se réveille tôt mais se rendort' },
          { value: '2', label: '2 - Incapable de se rendormir' }
        ]
      },
      {
        id: 'work', label: 'Travail et activités (0-4)', type: 'select',
        options: [
          { value: '0', label: '0 - Pas de difficulté' },
          { value: '1', label: '1 - Pensées et sentiments d\'incapacité' },
          { value: '2', label: '2 - Perte d\'intérêt' },
          { value: '3', label: '3 - Diminution du temps d\'activité' },
          { value: '4', label: '4 - Arrêt du travail' }
        ]
      },
      { id: 'anxiety_psychic', label: 'Anxiété psychique (0-4)', type: 'number', placeholder: '0', min: 0, max: 4 },
      { id: 'anxiety_somatic', label: 'Anxiété somatique (0-4)', type: 'number', placeholder: '0', min: 0, max: 4 },
      { id: 'somatic_gi', label: 'Symptômes somatiques gastro-intestinaux (0-2)', type: 'number', placeholder: '0', min: 0, max: 2 },
      { id: 'somatic_general', label: 'Symptômes somatiques généraux (0-2)', type: 'number', placeholder: '0', min: 0, max: 2 },
      { id: 'genital', label: 'Symptômes génitaux (0-2)', type: 'number', placeholder: '0', min: 0, max: 2 },
      { id: 'hypochondriasis', label: 'Hypocondrie (0-4)', type: 'number', placeholder: '0', min: 0, max: 4 },
      { id: 'weight_loss', label: 'Perte de poids (0-2)', type: 'number', placeholder: '0', min: 0, max: 2 },
      { id: 'insight', label: 'Conscience de la maladie (0-2)', type: 'number', placeholder: '0', min: 0, max: 2 }
    ],
    calculate: (inputs): CalculatorResult => {
      const fields = ['depressed_mood', 'guilt', 'suicide', 'insomnia_early', 'insomnia_middle', 
                     'insomnia_late', 'work', 'anxiety_psychic', 'anxiety_somatic', 'somatic_gi',
                     'somatic_general', 'genital', 'hypochondriasis', 'weight_loss', 'insight'];
      
      let total = 0;
      fields.forEach(f => { total += parseInt(inputs[f] || '0'); });
      
      let interpretation = '';
      let severity: 'low' | 'normal' | 'high' | 'critical' = 'normal';
      
      if (total <= 7) {
        interpretation = 'Pas de dépression';
        severity = 'normal';
      } else if (total <= 13) {
        interpretation = 'Dépression légère';
        severity = 'low';
      } else if (total <= 18) {
        interpretation = 'Dépression modérée';
        severity = 'high';
      } else if (total <= 22) {
        interpretation = 'Dépression sévère';
        severity = 'critical';
      } else {
        interpretation = 'Dépression très sévère';
        severity = 'critical';
      }
      
      if (parseInt(inputs.suicide || '0') >= 2) {
        interpretation += ' ⚠️ RISQUE SUICIDAIRE - ÉVALUATION URGENTE';
        severity = 'critical';
      }
      
      return {
        value: total,
        unit: '/52',
        interpretation,
        normalRange: '0-7',
        severity
      };
    }
  },
  {
    id: 'ymrs',
    name: 'YMRS',
    description: 'Young Mania Rating Scale - Épisode maniaque',
    category: 'psychiatry',
    fields: [
      { id: 'elevated_mood', label: 'Humeur exaltée (0-4)', type: 'number', placeholder: '0', min: 0, max: 4 },
      { id: 'motor_activity', label: 'Activité motrice/énergie (0-4)', type: 'number', placeholder: '0', min: 0, max: 4 },
      { id: 'sexual_interest', label: 'Intérêt sexuel (0-4)', type: 'number', placeholder: '0', min: 0, max: 4 },
      { id: 'sleep', label: 'Sommeil (0-4)', type: 'number', placeholder: '0', min: 0, max: 4 },
      { id: 'irritability', label: 'Irritabilité (0-8)', type: 'number', placeholder: '0', min: 0, max: 8 },
      { id: 'speech', label: 'Débit verbal (0-8)', type: 'number', placeholder: '0', min: 0, max: 8 },
      { id: 'thought_disorder', label: 'Troubles de la pensée (0-4)', type: 'number', placeholder: '0', min: 0, max: 4 },
      { id: 'thought_content', label: 'Contenu de la pensée (0-8)', type: 'number', placeholder: '0', min: 0, max: 8 },
      { id: 'aggressive_behavior', label: 'Comportement agressif (0-8)', type: 'number', placeholder: '0', min: 0, max: 8 },
      { id: 'appearance', label: 'Apparence (0-4)', type: 'number', placeholder: '0', min: 0, max: 4 },
      { id: 'insight', label: 'Conscience de la maladie (0-4)', type: 'number', placeholder: '0', min: 0, max: 4 }
    ],
    calculate: (inputs): CalculatorResult => {
      const fields = ['elevated_mood', 'motor_activity', 'sexual_interest', 'sleep', 'irritability',
                     'speech', 'thought_disorder', 'thought_content', 'aggressive_behavior', 'appearance', 'insight'];
      
      let total = 0;
      fields.forEach(f => { total += parseInt(inputs[f] || '0'); });
      
      let interpretation = '';
      let severity: 'low' | 'normal' | 'high' | 'critical' = 'normal';
      
      if (total <= 12) {
        interpretation = 'Euthymie ou symptômes minimes';
        severity = 'normal';
      } else if (total <= 19) {
        interpretation = 'Hypomanie légère';
        severity = 'low';
      } else if (total <= 25) {
        interpretation = 'Manie modérée';
        severity = 'high';
      } else {
        interpretation = 'Manie sévère - Hospitalisation à considérer';
        severity = 'critical';
      }
      
      return {
        value: total,
        unit: '/60',
        interpretation,
        normalRange: '0-12',
        severity
      };
    }
  },
  {
    id: 'cgi',
    name: 'CGI (Clinical Global Impression)',
    description: 'Impression clinique globale',
    category: 'psychiatry',
    fields: [
      {
        id: 'severity', label: 'CGI-S - Sévérité de la maladie', type: 'select',
        options: [
          { value: '1', label: '1 - Normal, pas du tout malade' },
          { value: '2', label: '2 - À la limite' },
          { value: '3', label: '3 - Légèrement malade' },
          { value: '4', label: '4 - Modérément malade' },
          { value: '5', label: '5 - Manifestement malade' },
          { value: '6', label: '6 - Gravement malade' },
          { value: '7', label: '7 - Parmi les patients les plus malades' }
        ]
      },
      {
        id: 'improvement', label: 'CGI-I - Amélioration globale', type: 'select',
        options: [
          { value: '1', label: '1 - Très fortement amélioré' },
          { value: '2', label: '2 - Fortement amélioré' },
          { value: '3', label: '3 - Légèrement amélioré' },
          { value: '4', label: '4 - Pas de changement' },
          { value: '5', label: '5 - Légèrement aggravé' },
          { value: '6', label: '6 - Fortement aggravé' },
          { value: '7', label: '7 - Très fortement aggravé' }
        ]
      }
    ],
    calculate: (inputs): CalculatorResult => {
      const severity = parseInt(inputs.severity || '1');
      const improvement = parseInt(inputs.improvement || '4');
      
      let interpretation = '';
      let severityLevel: 'low' | 'normal' | 'high' | 'critical' = 'normal';
      
      const severityLabels = ['', 'Normal', 'À la limite', 'Légèrement malade', 'Modérément malade', 
                              'Manifestement malade', 'Gravement malade', 'Extrêmement malade'];
      const improvementLabels = ['', 'Très fortement amélioré', 'Fortement amélioré', 'Légèrement amélioré',
                                  'Pas de changement', 'Légèrement aggravé', 'Fortement aggravé', 'Très fortement aggravé'];
      
      interpretation = `Sévérité: ${severityLabels[severity]} | Évolution: ${improvementLabels[improvement]}`;
      
      if (severity <= 2) severityLevel = 'normal';
      else if (severity <= 4) severityLevel = 'high';
      else severityLevel = 'critical';
      
      return {
        value: `S${severity}/I${improvement}`,
        unit: '',
        interpretation,
        normalRange: 'S1-2 / I1-3',
        severity: severityLevel
      };
    }
  }
];
