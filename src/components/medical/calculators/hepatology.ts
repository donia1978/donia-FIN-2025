import { CalculatorDefinition, CalculatorResult } from './types';

export const hepatologyCalculators: CalculatorDefinition[] = [
  {
    id: 'meld',
    name: 'Score MELD',
    description: 'Model for End-Stage Liver Disease',
    category: 'hepatology',
    fields: [
      { id: 'bilirubin', label: 'Bilirubine totale (mg/dL)', type: 'number', placeholder: '1.0', step: '0.1' },
      { id: 'inr', label: 'INR', type: 'number', placeholder: '1.0', step: '0.1' },
      { id: 'creatinine', label: 'Créatinine (mg/dL)', type: 'number', placeholder: '1.0', step: '0.1' },
      { id: 'dialysis', label: 'Dialyse (≥2 fois/semaine)', type: 'checkbox' },
      { id: 'sodium', label: 'Sodium (mEq/L) - pour MELD-Na', type: 'number', placeholder: '140' }
    ],
    calculate: (inputs): CalculatorResult => {
      let bili = parseFloat(inputs.bilirubin || '1');
      let inr = parseFloat(inputs.inr || '1');
      let cr = parseFloat(inputs.creatinine || '1');
      const sodium = parseFloat(inputs.sodium || '140');
      
      // Set minimum values
      if (bili < 1) bili = 1;
      if (inr < 1) inr = 1;
      if (cr < 1) cr = 1;
      if (inputs.dialysis) cr = 4;
      if (cr > 4) cr = 4;
      
      // MELD calculation
      const meld = 10 * (0.957 * Math.log(cr) + 0.378 * Math.log(bili) + 1.120 * Math.log(inr) + 0.643);
      
      // MELD-Na calculation
      let meldNa = meld;
      if (sodium >= 125 && sodium <= 137) {
        meldNa = meld + 1.32 * (137 - sodium) - (0.033 * meld * (137 - sodium));
      } else if (sodium < 125) {
        meldNa = meld + 1.32 * 12 - (0.033 * meld * 12);
      }
      
      const finalMeld = Math.round(Math.max(6, Math.min(40, meldNa)));
      
      let mortality = '';
      let severity: 'low' | 'normal' | 'high' | 'critical' = 'low';
      
      if (finalMeld <= 9) { mortality = 'Mortalité 3 mois: 1.9%'; severity = 'low'; }
      else if (finalMeld <= 19) { mortality = 'Mortalité 3 mois: 6%'; severity = 'high'; }
      else if (finalMeld <= 29) { mortality = 'Mortalité 3 mois: 19.6%'; severity = 'critical'; }
      else if (finalMeld <= 39) { mortality = 'Mortalité 3 mois: 52.6%'; severity = 'critical'; }
      else { mortality = 'Mortalité 3 mois: 71.3%'; severity = 'critical'; }
      
      return {
        value: finalMeld,
        unit: 'pts',
        interpretation: `MELD-Na: ${mortality}`,
        normalRange: '≤9 (risque faible)',
        severity
      };
    }
  },
  {
    id: 'childpugh',
    name: 'Score de Child-Pugh',
    description: 'Classification de la cirrhose',
    category: 'hepatology',
    fields: [
      {
        id: 'encephalopathy', label: 'Encéphalopathie', type: 'select',
        options: [
          { value: '1', label: 'Aucune (1 pt)' },
          { value: '2', label: 'Grade I-II (2 pts)' },
          { value: '3', label: 'Grade III-IV (3 pts)' }
        ]
      },
      {
        id: 'ascites', label: 'Ascite', type: 'select',
        options: [
          { value: '1', label: 'Absente (1 pt)' },
          { value: '2', label: 'Légère/Contrôlée (2 pts)' },
          { value: '3', label: 'Modérée/Réfractaire (3 pts)' }
        ]
      },
      {
        id: 'bilirubin', label: 'Bilirubine (mg/dL)', type: 'select',
        options: [
          { value: '1', label: '< 2 (1 pt)' },
          { value: '2', label: '2-3 (2 pts)' },
          { value: '3', label: '> 3 (3 pts)' }
        ]
      },
      {
        id: 'albumin', label: 'Albumine (g/dL)', type: 'select',
        options: [
          { value: '1', label: '> 3.5 (1 pt)' },
          { value: '2', label: '2.8-3.5 (2 pts)' },
          { value: '3', label: '< 2.8 (3 pts)' }
        ]
      },
      {
        id: 'inr', label: 'INR / TP', type: 'select',
        options: [
          { value: '1', label: '< 1.7 / > 50% (1 pt)' },
          { value: '2', label: '1.7-2.3 / 30-50% (2 pts)' },
          { value: '3', label: '> 2.3 / < 30% (3 pts)' }
        ]
      }
    ],
    calculate: (inputs): CalculatorResult => {
      const total = parseInt(inputs.encephalopathy || '1') + parseInt(inputs.ascites || '1') +
                   parseInt(inputs.bilirubin || '1') + parseInt(inputs.albumin || '1') +
                   parseInt(inputs.inr || '1');
      
      let classification = '';
      let mortality = '';
      let severity: 'low' | 'normal' | 'high' | 'critical' = 'low';
      
      if (total <= 6) {
        classification = 'Classe A - Cirrhose compensée';
        mortality = 'Survie 1 an: 100%, 2 ans: 85%';
        severity = 'low';
      } else if (total <= 9) {
        classification = 'Classe B - Atteinte significative';
        mortality = 'Survie 1 an: 80%, 2 ans: 60%';
        severity = 'high';
      } else {
        classification = 'Classe C - Cirrhose décompensée';
        mortality = 'Survie 1 an: 45%, 2 ans: 35%';
        severity = 'critical';
      }
      
      return {
        value: total,
        unit: '/15',
        interpretation: `${classification} - ${mortality}`,
        normalRange: '5-6 (Classe A)',
        severity
      };
    }
  },
  {
    id: 'rockall',
    name: 'Score de Rockall',
    description: 'Risque dans l\'hémorragie digestive haute',
    category: 'hepatology',
    fields: [
      {
        id: 'age', label: 'Âge', type: 'select',
        options: [
          { value: '0', label: '< 60 ans (0 pts)' },
          { value: '1', label: '60-79 ans (1 pt)' },
          { value: '2', label: '≥ 80 ans (2 pts)' }
        ]
      },
      {
        id: 'shock', label: 'État de choc', type: 'select',
        options: [
          { value: '0', label: 'Pas de choc (PAS ≥ 100, FC < 100) (0 pts)' },
          { value: '1', label: 'Tachycardie (PAS ≥ 100, FC ≥ 100) (1 pt)' },
          { value: '2', label: 'Hypotension (PAS < 100) (2 pts)' }
        ]
      },
      {
        id: 'comorbidity', label: 'Comorbidités', type: 'select',
        options: [
          { value: '0', label: 'Aucune comorbidité majeure (0 pts)' },
          { value: '2', label: 'Cardiopathie, autre maladie majeure (2 pts)' },
          { value: '3', label: 'IRC, insuffisance hépatique, cancer (3 pts)' }
        ]
      },
      {
        id: 'diagnosis', label: 'Diagnostic endoscopique', type: 'select',
        options: [
          { value: '0', label: 'Mallory-Weiss, pas de lésion (0 pts)' },
          { value: '1', label: 'Tous les autres diagnostics (1 pt)' },
          { value: '2', label: 'Cancer digestif haut (2 pts)' }
        ]
      },
      {
        id: 'stigmata', label: 'Stigmates de saignement', type: 'select',
        options: [
          { value: '0', label: 'Aucun ou spot pigmenté (0 pts)' },
          { value: '2', label: 'Sang, caillot adhérent, vaisseau visible (2 pts)' }
        ]
      }
    ],
    calculate: (inputs): CalculatorResult => {
      const total = parseInt(inputs.age || '0') + parseInt(inputs.shock || '0') +
                   parseInt(inputs.comorbidity || '0') + parseInt(inputs.diagnosis || '0') +
                   parseInt(inputs.stigmata || '0');
      
      let risk = '';
      let severity: 'low' | 'normal' | 'high' | 'critical' = 'low';
      
      if (total <= 2) {
        risk = 'Risque faible - Mortalité < 5%, récidive < 5%';
        severity = 'low';
      } else if (total <= 4) {
        risk = 'Risque intermédiaire - Mortalité 5-10%';
        severity = 'high';
      } else if (total <= 7) {
        risk = 'Risque élevé - Mortalité 10-25%';
        severity = 'critical';
      } else {
        risk = 'Risque très élevé - Mortalité > 25%';
        severity = 'critical';
      }
      
      return {
        value: total,
        unit: '/11',
        interpretation: risk,
        normalRange: '≤2 (risque faible)',
        severity
      };
    }
  }
];
