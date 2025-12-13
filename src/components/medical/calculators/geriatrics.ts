import { CalculatorDefinition, CalculatorResult } from './types';

export const geriatricsCalculators: CalculatorDefinition[] = [
  {
    id: 'mmse',
    name: 'MMSE (Mini Mental State)',
    description: 'Évaluation cognitive globale',
    category: 'geriatrics',
    fields: [
      { id: 'orientation_time', label: 'Orientation temporelle (0-5)', type: 'number', placeholder: '5', min: 0, max: 5 },
      { id: 'orientation_place', label: 'Orientation spatiale (0-5)', type: 'number', placeholder: '5', min: 0, max: 5 },
      { id: 'registration', label: 'Apprentissage 3 mots (0-3)', type: 'number', placeholder: '3', min: 0, max: 3 },
      { id: 'attention', label: 'Attention et calcul (0-5)', type: 'number', placeholder: '5', min: 0, max: 5 },
      { id: 'recall', label: 'Rappel 3 mots (0-3)', type: 'number', placeholder: '3', min: 0, max: 3 },
      { id: 'language', label: 'Langage (0-8)', type: 'number', placeholder: '8', min: 0, max: 8 },
      { id: 'praxis', label: 'Praxie constructive (0-1)', type: 'number', placeholder: '1', min: 0, max: 1 }
    ],
    calculate: (inputs): CalculatorResult => {
      const total = parseInt(inputs.orientation_time || '0') + parseInt(inputs.orientation_place || '0') +
                   parseInt(inputs.registration || '0') + parseInt(inputs.attention || '0') +
                   parseInt(inputs.recall || '0') + parseInt(inputs.language || '0') +
                   parseInt(inputs.praxis || '0');
      
      let interpretation = '';
      let severity: 'low' | 'normal' | 'high' | 'critical' = 'normal';
      
      if (total >= 27) {
        interpretation = 'Fonctions cognitives normales';
        severity = 'normal';
      } else if (total >= 24) {
        interpretation = 'Déclin cognitif léger possible';
        severity = 'low';
      } else if (total >= 20) {
        interpretation = 'Démence légère';
        severity = 'high';
      } else if (total >= 10) {
        interpretation = 'Démence modérée';
        severity = 'critical';
      } else {
        interpretation = 'Démence sévère';
        severity = 'critical';
      }
      
      return {
        value: total,
        unit: '/30',
        interpretation,
        normalRange: '≥27',
        severity
      };
    }
  },
  {
    id: 'adl',
    name: 'ADL (Index de Katz)',
    description: 'Activités de la vie quotidienne',
    category: 'geriatrics',
    fields: [
      { id: 'bathing', label: 'Se laver (bain/douche)', type: 'checkbox' },
      { id: 'dressing', label: 'S\'habiller', type: 'checkbox' },
      { id: 'toileting', label: 'Aller aux toilettes', type: 'checkbox' },
      { id: 'transferring', label: 'Se déplacer (lit/chaise)', type: 'checkbox' },
      { id: 'continence', label: 'Continence', type: 'checkbox' },
      { id: 'feeding', label: 'Se nourrir', type: 'checkbox' }
    ],
    calculate: (inputs): CalculatorResult => {
      let score = 0;
      if (inputs.bathing) score++;
      if (inputs.dressing) score++;
      if (inputs.toileting) score++;
      if (inputs.transferring) score++;
      if (inputs.continence) score++;
      if (inputs.feeding) score++;
      
      let interpretation = '';
      let severity: 'low' | 'normal' | 'high' | 'critical' = 'normal';
      
      if (score === 6) {
        interpretation = 'Indépendance totale';
        severity = 'normal';
      } else if (score >= 4) {
        interpretation = 'Dépendance légère';
        severity = 'low';
      } else if (score >= 2) {
        interpretation = 'Dépendance modérée';
        severity = 'high';
      } else {
        interpretation = 'Dépendance sévère';
        severity = 'critical';
      }
      
      return {
        value: score,
        unit: '/6',
        interpretation,
        normalRange: '6/6 (indépendance)',
        severity
      };
    }
  },
  {
    id: 'iadl',
    name: 'IADL (Lawton)',
    description: 'Activités instrumentales de la vie quotidienne',
    category: 'geriatrics',
    fields: [
      { id: 'telephone', label: 'Utiliser le téléphone', type: 'checkbox' },
      { id: 'shopping', label: 'Faire les courses', type: 'checkbox' },
      { id: 'cooking', label: 'Préparer les repas', type: 'checkbox' },
      { id: 'housekeeping', label: 'Entretien ménager', type: 'checkbox' },
      { id: 'laundry', label: 'Faire la lessive', type: 'checkbox' },
      { id: 'transport', label: 'Utiliser les transports', type: 'checkbox' },
      { id: 'medications', label: 'Gérer les médicaments', type: 'checkbox' },
      { id: 'finances', label: 'Gérer les finances', type: 'checkbox' }
    ],
    calculate: (inputs): CalculatorResult => {
      let score = 0;
      if (inputs.telephone) score++;
      if (inputs.shopping) score++;
      if (inputs.cooking) score++;
      if (inputs.housekeeping) score++;
      if (inputs.laundry) score++;
      if (inputs.transport) score++;
      if (inputs.medications) score++;
      if (inputs.finances) score++;
      
      let interpretation = '';
      let severity: 'low' | 'normal' | 'high' | 'critical' = 'normal';
      
      if (score === 8) {
        interpretation = 'Autonomie complète';
        severity = 'normal';
      } else if (score >= 6) {
        interpretation = 'Autonomie légèrement réduite';
        severity = 'low';
      } else if (score >= 4) {
        interpretation = 'Autonomie modérément réduite - Aide requise';
        severity = 'high';
      } else {
        interpretation = 'Autonomie très réduite - Dépendance importante';
        severity = 'critical';
      }
      
      return {
        value: score,
        unit: '/8',
        interpretation,
        normalRange: '8/8 (autonomie)',
        severity
      };
    }
  },
  {
    id: 'tinetti',
    name: 'Échelle de Tinetti',
    description: 'Évaluation de l\'équilibre et de la marche',
    category: 'geriatrics',
    fields: [
      { id: 'sitting_balance', label: 'Équilibre assis (0-2)', type: 'number', placeholder: '2', min: 0, max: 2 },
      { id: 'rising', label: 'Se lever (0-2)', type: 'number', placeholder: '2', min: 0, max: 2 },
      { id: 'standing_balance', label: 'Équilibre debout immédiat (0-2)', type: 'number', placeholder: '2', min: 0, max: 2 },
      { id: 'standing_balance_prolonged', label: 'Équilibre debout prolongé (0-2)', type: 'number', placeholder: '2', min: 0, max: 2 },
      { id: 'nudge', label: 'Test de poussée (0-2)', type: 'number', placeholder: '2', min: 0, max: 2 },
      { id: 'eyes_closed', label: 'Yeux fermés (0-1)', type: 'number', placeholder: '1', min: 0, max: 1 },
      { id: 'turning', label: 'Tour 360° (0-2)', type: 'number', placeholder: '2', min: 0, max: 2 },
      { id: 'sitting_down', label: 'S\'asseoir (0-2)', type: 'number', placeholder: '2', min: 0, max: 2 },
      { id: 'gait_initiation', label: 'Initiation marche (0-1)', type: 'number', placeholder: '1', min: 0, max: 1 },
      { id: 'step_length', label: 'Longueur du pas (0-2)', type: 'number', placeholder: '2', min: 0, max: 2 },
      { id: 'step_symmetry', label: 'Symétrie du pas (0-1)', type: 'number', placeholder: '1', min: 0, max: 1 },
      { id: 'step_continuity', label: 'Continuité du pas (0-1)', type: 'number', placeholder: '1', min: 0, max: 1 },
      { id: 'path', label: 'Trajectoire (0-2)', type: 'number', placeholder: '2', min: 0, max: 2 },
      { id: 'trunk', label: 'Stabilité du tronc (0-2)', type: 'number', placeholder: '2', min: 0, max: 2 },
      { id: 'walking_stance', label: 'Écartement des pieds (0-1)', type: 'number', placeholder: '1', min: 0, max: 1 }
    ],
    calculate: (inputs): CalculatorResult => {
      const balance = parseInt(inputs.sitting_balance || '0') + parseInt(inputs.rising || '0') +
                     parseInt(inputs.standing_balance || '0') + parseInt(inputs.standing_balance_prolonged || '0') +
                     parseInt(inputs.nudge || '0') + parseInt(inputs.eyes_closed || '0') +
                     parseInt(inputs.turning || '0') + parseInt(inputs.sitting_down || '0');
      
      const gait = parseInt(inputs.gait_initiation || '0') + parseInt(inputs.step_length || '0') +
                  parseInt(inputs.step_symmetry || '0') + parseInt(inputs.step_continuity || '0') +
                  parseInt(inputs.path || '0') + parseInt(inputs.trunk || '0') +
                  parseInt(inputs.walking_stance || '0');
      
      const total = balance + gait;
      
      let interpretation = '';
      let severity: 'low' | 'normal' | 'high' | 'critical' = 'normal';
      
      if (total >= 24) {
        interpretation = 'Risque faible de chute';
        severity = 'normal';
      } else if (total >= 19) {
        interpretation = 'Risque modéré de chute';
        severity = 'high';
      } else {
        interpretation = 'Risque élevé de chute - Prévention urgente';
        severity = 'critical';
      }
      
      return {
        value: total,
        unit: '/28',
        interpretation: `Équilibre: ${balance}/16, Marche: ${gait}/12 - ${interpretation}`,
        normalRange: '≥24',
        severity
      };
    }
  }
];
