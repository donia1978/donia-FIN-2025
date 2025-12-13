import { CalculatorDefinition, CalculatorResult } from './types';

export const reanimationCalculators: CalculatorDefinition[] = [
  {
    id: 'glasgow',
    name: 'Score de Glasgow (GCS)',
    description: 'Évaluation du niveau de conscience',
    category: 'reanimation',
    fields: [
      {
        id: 'eye', label: 'Réponse oculaire (E)', type: 'select',
        options: [
          { value: '4', label: '4 - Spontanée' },
          { value: '3', label: '3 - À la demande verbale' },
          { value: '2', label: '2 - À la douleur' },
          { value: '1', label: '1 - Aucune' }
        ]
      },
      {
        id: 'verbal', label: 'Réponse verbale (V)', type: 'select',
        options: [
          { value: '5', label: '5 - Orientée' },
          { value: '4', label: '4 - Confuse' },
          { value: '3', label: '3 - Mots inappropriés' },
          { value: '2', label: '2 - Sons incompréhensibles' },
          { value: '1', label: '1 - Aucune' }
        ]
      },
      {
        id: 'motor', label: 'Réponse motrice (M)', type: 'select',
        options: [
          { value: '6', label: '6 - Obéit aux ordres' },
          { value: '5', label: '5 - Localise la douleur' },
          { value: '4', label: '4 - Évitement' },
          { value: '3', label: '3 - Flexion anormale' },
          { value: '2', label: '2 - Extension' },
          { value: '1', label: '1 - Aucune' }
        ]
      }
    ],
    calculate: (inputs): CalculatorResult => {
      const total = parseInt(inputs.eye || '4') + parseInt(inputs.verbal || '5') + parseInt(inputs.motor || '6');
      let interpretation = '';
      let severity: 'low' | 'normal' | 'high' | 'critical' = 'normal';
      
      if (total >= 13) { interpretation = 'Traumatisme crânien léger'; severity = 'normal'; }
      else if (total >= 9) { interpretation = 'Traumatisme crânien modéré'; severity = 'high'; }
      else { interpretation = 'Traumatisme crânien sévère'; severity = 'critical'; }
      
      return { value: total, unit: '/15', interpretation, normalRange: '15/15', severity };
    }
  },
  {
    id: 'qsofa',
    name: 'qSOFA (Quick SOFA)',
    description: 'Dépistage rapide du sepsis',
    category: 'reanimation',
    fields: [
      { id: 'altered_mental', label: 'Altération de l\'état mental (GCS < 15)', type: 'checkbox' },
      { id: 'sbp_low', label: 'Pression artérielle systolique ≤ 100 mmHg', type: 'checkbox' },
      { id: 'rr_high', label: 'Fréquence respiratoire ≥ 22/min', type: 'checkbox' }
    ],
    calculate: (inputs): CalculatorResult => {
      let score = 0;
      if (inputs.altered_mental) score++;
      if (inputs.sbp_low) score++;
      if (inputs.rr_high) score++;
      
      let interpretation = '';
      let severity: 'low' | 'normal' | 'high' | 'critical' = 'normal';
      
      if (score >= 2) {
        interpretation = 'Risque élevé de sepsis - investigation urgente requise';
        severity = 'critical';
      } else if (score === 1) {
        interpretation = 'Risque modéré - surveillance rapprochée';
        severity = 'high';
      } else {
        interpretation = 'Risque faible de sepsis';
        severity = 'low';
      }
      
      return { value: score, unit: '/3', interpretation, normalRange: '0/3', severity };
    }
  },
  {
    id: 'sofa',
    name: 'Score SOFA',
    description: 'Sequential Organ Failure Assessment',
    category: 'reanimation',
    fields: [
      {
        id: 'pao2_fio2', label: 'PaO2/FiO2', type: 'select',
        options: [
          { value: '0', label: '≥ 400 (0 pts)' },
          { value: '1', label: '300-399 (1 pt)' },
          { value: '2', label: '200-299 (2 pts)' },
          { value: '3', label: '100-199 avec ventilation (3 pts)' },
          { value: '4', label: '< 100 avec ventilation (4 pts)' }
        ]
      },
      {
        id: 'platelets', label: 'Plaquettes (×10³/µL)', type: 'select',
        options: [
          { value: '0', label: '≥ 150 (0 pts)' },
          { value: '1', label: '100-149 (1 pt)' },
          { value: '2', label: '50-99 (2 pts)' },
          { value: '3', label: '20-49 (3 pts)' },
          { value: '4', label: '< 20 (4 pts)' }
        ]
      },
      {
        id: 'bilirubin', label: 'Bilirubine (mg/dL)', type: 'select',
        options: [
          { value: '0', label: '< 1.2 (0 pts)' },
          { value: '1', label: '1.2-1.9 (1 pt)' },
          { value: '2', label: '2.0-5.9 (2 pts)' },
          { value: '3', label: '6.0-11.9 (3 pts)' },
          { value: '4', label: '≥ 12 (4 pts)' }
        ]
      },
      {
        id: 'cardiovascular', label: 'Cardiovasculaire', type: 'select',
        options: [
          { value: '0', label: 'PAM ≥ 70 mmHg (0 pts)' },
          { value: '1', label: 'PAM < 70 mmHg (1 pt)' },
          { value: '2', label: 'Dopamine ≤ 5 ou Dobutamine (2 pts)' },
          { value: '3', label: 'Dopamine > 5 ou Adrénaline ≤ 0.1 (3 pts)' },
          { value: '4', label: 'Dopamine > 15 ou Adrénaline > 0.1 (4 pts)' }
        ]
      },
      {
        id: 'gcs', label: 'Score de Glasgow', type: 'select',
        options: [
          { value: '0', label: '15 (0 pts)' },
          { value: '1', label: '13-14 (1 pt)' },
          { value: '2', label: '10-12 (2 pts)' },
          { value: '3', label: '6-9 (3 pts)' },
          { value: '4', label: '< 6 (4 pts)' }
        ]
      },
      {
        id: 'creatinine', label: 'Créatinine (mg/dL) ou diurèse', type: 'select',
        options: [
          { value: '0', label: '< 1.2 (0 pts)' },
          { value: '1', label: '1.2-1.9 (1 pt)' },
          { value: '2', label: '2.0-3.4 (2 pts)' },
          { value: '3', label: '3.5-4.9 ou diurèse < 500 mL/j (3 pts)' },
          { value: '4', label: '≥ 5.0 ou diurèse < 200 mL/j (4 pts)' }
        ]
      }
    ],
    calculate: (inputs): CalculatorResult => {
      const total = parseInt(inputs.pao2_fio2 || '0') + parseInt(inputs.platelets || '0') +
                   parseInt(inputs.bilirubin || '0') + parseInt(inputs.cardiovascular || '0') +
                   parseInt(inputs.gcs || '0') + parseInt(inputs.creatinine || '0');
      
      let interpretation = '';
      let severity: 'low' | 'normal' | 'high' | 'critical' = 'normal';
      const mortality = total <= 6 ? '<10%' : total <= 9 ? '15-20%' : total <= 12 ? '40-50%' : '>80%';
      
      if (total <= 6) { interpretation = `Défaillance légère - Mortalité ${mortality}`; severity = 'low'; }
      else if (total <= 9) { interpretation = `Défaillance modérée - Mortalité ${mortality}`; severity = 'high'; }
      else if (total <= 12) { interpretation = `Défaillance sévère - Mortalité ${mortality}`; severity = 'critical'; }
      else { interpretation = `Défaillance très sévère - Mortalité ${mortality}`; severity = 'critical'; }
      
      return { value: total, unit: '/24', interpretation, normalRange: '0-6', severity };
    }
  },
  {
    id: 'news',
    name: 'NEWS (National Early Warning Score)',
    description: 'Score d\'alerte précoce',
    category: 'reanimation',
    fields: [
      {
        id: 'rr', label: 'Fréquence respiratoire', type: 'select',
        options: [
          { value: '3', label: '≤ 8 (3 pts)' },
          { value: '1', label: '9-11 (1 pt)' },
          { value: '0', label: '12-20 (0 pts)' },
          { value: '2', label: '21-24 (2 pts)' },
          { value: '3b', label: '≥ 25 (3 pts)' }
        ]
      },
      {
        id: 'spo2', label: 'SpO2', type: 'select',
        options: [
          { value: '3', label: '≤ 91% (3 pts)' },
          { value: '2', label: '92-93% (2 pts)' },
          { value: '1', label: '94-95% (1 pt)' },
          { value: '0', label: '≥ 96% (0 pts)' }
        ]
      },
      {
        id: 'o2', label: 'Oxygène supplémentaire', type: 'select',
        options: [
          { value: '0', label: 'Non (0 pts)' },
          { value: '2', label: 'Oui (2 pts)' }
        ]
      },
      {
        id: 'temp', label: 'Température', type: 'select',
        options: [
          { value: '3', label: '≤ 35.0°C (3 pts)' },
          { value: '1', label: '35.1-36.0°C (1 pt)' },
          { value: '0', label: '36.1-38.0°C (0 pts)' },
          { value: '1b', label: '38.1-39.0°C (1 pt)' },
          { value: '2', label: '≥ 39.1°C (2 pts)' }
        ]
      },
      {
        id: 'sbp', label: 'Pression artérielle systolique', type: 'select',
        options: [
          { value: '3', label: '≤ 90 mmHg (3 pts)' },
          { value: '2', label: '91-100 mmHg (2 pts)' },
          { value: '1', label: '101-110 mmHg (1 pt)' },
          { value: '0', label: '111-219 mmHg (0 pts)' },
          { value: '3b', label: '≥ 220 mmHg (3 pts)' }
        ]
      },
      {
        id: 'hr', label: 'Fréquence cardiaque', type: 'select',
        options: [
          { value: '3', label: '≤ 40 bpm (3 pts)' },
          { value: '1', label: '41-50 bpm (1 pt)' },
          { value: '0', label: '51-90 bpm (0 pts)' },
          { value: '1b', label: '91-110 bpm (1 pt)' },
          { value: '2', label: '111-130 bpm (2 pts)' },
          { value: '3c', label: '≥ 131 bpm (3 pts)' }
        ]
      },
      {
        id: 'consciousness', label: 'Conscience', type: 'select',
        options: [
          { value: '0', label: 'Alerte (0 pts)' },
          { value: '3', label: 'Confusion/V/P/U (3 pts)' }
        ]
      }
    ],
    calculate: (inputs): CalculatorResult => {
      const parseScore = (v: string) => parseInt(v.replace(/[a-z]/g, '')) || 0;
      const total = parseScore(inputs.rr || '0') + parseScore(inputs.spo2 || '0') +
                   parseScore(inputs.o2 || '0') + parseScore(inputs.temp || '0') +
                   parseScore(inputs.sbp || '0') + parseScore(inputs.hr || '0') +
                   parseScore(inputs.consciousness || '0');
      
      let interpretation = '';
      let severity: 'low' | 'normal' | 'high' | 'critical' = 'normal';
      
      if (total <= 4) { interpretation = 'Risque faible - Surveillance standard'; severity = 'low'; }
      else if (total <= 6) { interpretation = 'Risque modéré - Surveillance rapprochée'; severity = 'high'; }
      else { interpretation = 'Risque élevé - Évaluation urgente requise'; severity = 'critical'; }
      
      return { value: total, unit: '/20', interpretation, normalRange: '0-4', severity };
    }
  },
  {
    id: 'apache2',
    name: 'APACHE II',
    description: 'Acute Physiology and Chronic Health Evaluation',
    category: 'reanimation',
    fields: [
      { id: 'age', label: 'Âge (ans)', type: 'number', placeholder: '60' },
      {
        id: 'temp_score', label: 'Score Température', type: 'select',
        options: [
          { value: '4', label: '≥ 41°C ou ≤ 29.9°C (4 pts)' },
          { value: '3', label: '39-40.9°C ou 30-31.9°C (3 pts)' },
          { value: '2', label: '32-33.9°C (2 pts)' },
          { value: '1', label: '38.5-38.9°C ou 34-35.9°C (1 pt)' },
          { value: '0', label: '36-38.4°C (0 pts)' }
        ]
      },
      {
        id: 'map_score', label: 'Score PAM', type: 'select',
        options: [
          { value: '4', label: '≥ 160 ou ≤ 49 mmHg (4 pts)' },
          { value: '3', label: '130-159 mmHg (3 pts)' },
          { value: '2', label: '110-129 ou 50-69 mmHg (2 pts)' },
          { value: '0', label: '70-109 mmHg (0 pts)' }
        ]
      },
      {
        id: 'hr_score', label: 'Score Fréquence cardiaque', type: 'select',
        options: [
          { value: '4', label: '≥ 180 ou ≤ 39 bpm (4 pts)' },
          { value: '3', label: '140-179 ou 40-54 bpm (3 pts)' },
          { value: '2', label: '110-139 ou 55-69 bpm (2 pts)' },
          { value: '0', label: '70-109 bpm (0 pts)' }
        ]
      },
      {
        id: 'rr_score', label: 'Score Fréquence respiratoire', type: 'select',
        options: [
          { value: '4', label: '≥ 50 ou ≤ 5/min (4 pts)' },
          { value: '3', label: '35-49/min (3 pts)' },
          { value: '1', label: '25-34 ou 6-9/min (1 pt)' },
          { value: '0', label: '10-24/min (0 pts)' }
        ]
      },
      {
        id: 'gcs_score', label: 'Score Glasgow (15-GCS)', type: 'number', placeholder: '0', min: 0, max: 12 },
      {
        id: 'chronic', label: 'Maladie chronique grave', type: 'select',
        options: [
          { value: '0', label: 'Aucune (0 pts)' },
          { value: '2', label: 'Post-opératoire programmé (2 pts)' },
          { value: '5', label: 'Urgence ou non opéré (5 pts)' }
        ]
      }
    ],
    calculate: (inputs): CalculatorResult => {
      const age = parseInt(inputs.age || '0');
      let ageScore = 0;
      if (age >= 75) ageScore = 6;
      else if (age >= 65) ageScore = 5;
      else if (age >= 55) ageScore = 3;
      else if (age >= 45) ageScore = 2;
      
      const total = ageScore + parseInt(inputs.temp_score || '0') + parseInt(inputs.map_score || '0') +
                   parseInt(inputs.hr_score || '0') + parseInt(inputs.rr_score || '0') +
                   parseInt(inputs.gcs_score || '0') + parseInt(inputs.chronic || '0');
      
      let mortality = '';
      let severity: 'low' | 'normal' | 'high' | 'critical' = 'normal';
      
      if (total <= 4) { mortality = '~4%'; severity = 'low'; }
      else if (total <= 9) { mortality = '~8%'; severity = 'low'; }
      else if (total <= 14) { mortality = '~15%'; severity = 'high'; }
      else if (total <= 19) { mortality = '~25%'; severity = 'high'; }
      else if (total <= 24) { mortality = '~40%'; severity = 'critical'; }
      else if (total <= 29) { mortality = '~55%'; severity = 'critical'; }
      else { mortality = '>70%'; severity = 'critical'; }
      
      return {
        value: total,
        unit: 'pts',
        interpretation: `Mortalité hospitalière estimée: ${mortality}`,
        normalRange: '0-9 (risque faible)',
        severity
      };
    }
  }
];
