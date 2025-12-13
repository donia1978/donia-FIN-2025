import { CalculatorDefinition, CalculatorResult } from './types';

export const pulmonologyCalculators: CalculatorDefinition[] = [
  {
    id: 'curb65',
    name: 'CURB-65',
    description: 'Gravité de la pneumonie communautaire',
    category: 'pulmonology',
    fields: [
      { id: 'confusion', label: 'Confusion (nouvelle désorientation)', type: 'checkbox' },
      { id: 'urea', label: 'Urée > 7 mmol/L (ou BUN > 19 mg/dL)', type: 'checkbox' },
      { id: 'rr', label: 'Fréquence respiratoire ≥ 30/min', type: 'checkbox' },
      { id: 'bp', label: 'PAS < 90 mmHg ou PAD ≤ 60 mmHg', type: 'checkbox' },
      { id: 'age', label: 'Âge ≥ 65 ans', type: 'checkbox' }
    ],
    calculate: (inputs): CalculatorResult => {
      let score = 0;
      if (inputs.confusion) score++;
      if (inputs.urea) score++;
      if (inputs.rr) score++;
      if (inputs.bp) score++;
      if (inputs.age) score++;
      
      let recommendation = '';
      let severity: 'low' | 'normal' | 'high' | 'critical' = 'low';
      
      if (score === 0 || score === 1) {
        recommendation = 'Traitement ambulatoire possible - Mortalité <3%';
        severity = 'low';
      } else if (score === 2) {
        recommendation = 'Hospitalisation courte ou surveillance rapprochée - Mortalité 9%';
        severity = 'high';
      } else if (score === 3) {
        recommendation = 'Hospitalisation - Mortalité 17%';
        severity = 'critical';
      } else {
        recommendation = 'USI/Réanimation - Mortalité 42%';
        severity = 'critical';
      }
      
      return {
        value: score,
        unit: '/5',
        interpretation: recommendation,
        normalRange: '0-1 (ambulatoire)',
        severity
      };
    }
  },
  {
    id: 'berlin',
    name: 'Critères de Berlin (SDRA)',
    description: 'Classification du syndrome de détresse respiratoire aiguë',
    category: 'pulmonology',
    fields: [
      {
        id: 'timing', label: 'Délai d\'apparition', type: 'select',
        options: [
          { value: 'yes', label: '≤ 7 jours après agression ou symptômes' },
          { value: 'no', label: '> 7 jours' }
        ]
      },
      {
        id: 'imaging', label: 'Imagerie thoracique', type: 'select',
        options: [
          { value: 'yes', label: 'Opacités bilatérales non expliquées par épanchement/atélectasie/nodules' },
          { value: 'no', label: 'Autres anomalies' }
        ]
      },
      {
        id: 'edema', label: 'Origine de l\'œdème', type: 'select',
        options: [
          { value: 'yes', label: 'Non expliqué par insuffisance cardiaque/surcharge hydrique' },
          { value: 'no', label: 'Origine cardiaque probable' }
        ]
      },
      {
        id: 'pao2_fio2', label: 'PaO2/FiO2 (avec PEEP ≥ 5 cmH2O)', type: 'select',
        options: [
          { value: 'mild', label: '201-300 mmHg (Léger)' },
          { value: 'moderate', label: '101-200 mmHg (Modéré)' },
          { value: 'severe', label: '≤ 100 mmHg (Sévère)' },
          { value: 'none', label: '> 300 mmHg' }
        ]
      }
    ],
    calculate: (inputs): CalculatorResult => {
      const criteriaMet = inputs.timing === 'yes' && inputs.imaging === 'yes' && inputs.edema === 'yes';
      
      if (!criteriaMet) {
        return {
          value: 'Non',
          unit: '',
          interpretation: 'Critères de Berlin NON remplis - Pas de SDRA',
          normalRange: 'Tous critères requis',
          severity: 'low'
        };
      }
      
      let classification = '';
      let mortality = '';
      let severity: 'low' | 'normal' | 'high' | 'critical' = 'high';
      
      switch (inputs.pao2_fio2) {
        case 'mild':
          classification = 'SDRA LÉGER';
          mortality = 'Mortalité 27%';
          severity = 'high';
          break;
        case 'moderate':
          classification = 'SDRA MODÉRÉ';
          mortality = 'Mortalité 32%';
          severity = 'critical';
          break;
        case 'severe':
          classification = 'SDRA SÉVÈRE';
          mortality = 'Mortalité 45%';
          severity = 'critical';
          break;
        default:
          return {
            value: 'Non',
            unit: '',
            interpretation: 'PaO2/FiO2 insuffisant pour diagnostic SDRA',
            normalRange: 'PaO2/FiO2 ≤ 300',
            severity: 'low'
          };
      }
      
      return {
        value: classification,
        unit: '',
        interpretation: `${mortality} - Ventilation protectrice recommandée`,
        normalRange: 'Aucun critère',
        severity
      };
    }
  },
  {
    id: 'bode',
    name: 'Index BODE',
    description: 'Pronostic de la BPCO',
    category: 'pulmonology',
    fields: [
      {
        id: 'fev1', label: 'VEMS (% prédit)', type: 'select',
        options: [
          { value: '0', label: '≥ 65% (0 pts)' },
          { value: '1', label: '50-64% (1 pt)' },
          { value: '2', label: '36-49% (2 pts)' },
          { value: '3', label: '≤ 35% (3 pts)' }
        ]
      },
      {
        id: 'distance', label: 'Distance test de marche 6 min (m)', type: 'select',
        options: [
          { value: '0', label: '≥ 350m (0 pts)' },
          { value: '1', label: '250-349m (1 pt)' },
          { value: '2', label: '150-249m (2 pts)' },
          { value: '3', label: '≤ 149m (3 pts)' }
        ]
      },
      {
        id: 'mmrc', label: 'Échelle mMRC de dyspnée', type: 'select',
        options: [
          { value: '0', label: '0-1 (0 pts)' },
          { value: '1', label: '2 (1 pt)' },
          { value: '2', label: '3 (2 pts)' },
          { value: '3', label: '4 (3 pts)' }
        ]
      },
      {
        id: 'bmi', label: 'IMC (kg/m²)', type: 'select',
        options: [
          { value: '0', label: '> 21 (0 pts)' },
          { value: '1', label: '≤ 21 (1 pt)' }
        ]
      }
    ],
    calculate: (inputs): CalculatorResult => {
      const total = parseInt(inputs.fev1 || '0') + parseInt(inputs.distance || '0') +
                   parseInt(inputs.mmrc || '0') + parseInt(inputs.bmi || '0');
      
      let survival = '';
      let severity: 'low' | 'normal' | 'high' | 'critical' = 'low';
      
      if (total <= 2) {
        survival = 'Survie 4 ans: 80%';
        severity = 'low';
      } else if (total <= 4) {
        survival = 'Survie 4 ans: 67%';
        severity = 'high';
      } else if (total <= 6) {
        survival = 'Survie 4 ans: 57%';
        severity = 'high';
      } else {
        survival = 'Survie 4 ans: 18%';
        severity = 'critical';
      }
      
      return {
        value: total,
        unit: '/10',
        interpretation: survival,
        normalRange: '0-2 (bon pronostic)',
        severity
      };
    }
  }
];
