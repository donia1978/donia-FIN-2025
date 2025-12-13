import { CalculatorDefinition, CalculatorResult } from './types';

export const nephrologyCalculators: CalculatorDefinition[] = [
  {
    id: 'ckdepi',
    name: 'CKD-EPI',
    description: 'DFG estimé (formule CKD-EPI 2021)',
    category: 'nephrology',
    fields: [
      { id: 'creatinine', label: 'Créatinine (mg/dL)', type: 'number', placeholder: '1.0', step: '0.01' },
      { id: 'age', label: 'Âge (ans)', type: 'number', placeholder: '50' },
      { id: 'gender', label: 'Sexe', type: 'select', options: [
        { value: 'male', label: 'Homme' },
        { value: 'female', label: 'Femme' }
      ]}
    ],
    calculate: (inputs): CalculatorResult => {
      const cr = parseFloat(inputs.creatinine || '0');
      const age = parseInt(inputs.age || '0');
      const isFemale = inputs.gender === 'female';
      
      if (cr <= 0 || age <= 0) {
        return { value: 0, unit: 'mL/min/1.73m²', interpretation: 'Données invalides', normalRange: '≥90', severity: 'normal' };
      }
      
      // CKD-EPI 2021 (sans race)
      const kappa = isFemale ? 0.7 : 0.9;
      const alpha = isFemale ? -0.241 : -0.302;
      
      const gfr = 142 * Math.pow(Math.min(cr / kappa, 1), alpha) *
                  Math.pow(Math.max(cr / kappa, 1), -1.200) *
                  Math.pow(0.9938, age) *
                  (isFemale ? 1.012 : 1);
      
      let stage = '';
      let severity: 'low' | 'normal' | 'high' | 'critical' = 'normal';
      
      if (gfr >= 90) { stage = 'G1 - Fonction rénale normale'; severity = 'normal'; }
      else if (gfr >= 60) { stage = 'G2 - IRC légère'; severity = 'low'; }
      else if (gfr >= 45) { stage = 'G3a - IRC modérée'; severity = 'high'; }
      else if (gfr >= 30) { stage = 'G3b - IRC modérée à sévère'; severity = 'high'; }
      else if (gfr >= 15) { stage = 'G4 - IRC sévère'; severity = 'critical'; }
      else { stage = 'G5 - IRC terminale'; severity = 'critical'; }
      
      return {
        value: gfr.toFixed(1),
        unit: 'mL/min/1.73m²',
        interpretation: stage,
        normalRange: '≥90 mL/min/1.73m²',
        severity
      };
    }
  },
  {
    id: 'cockcroft',
    name: 'Cockcroft-Gault',
    description: 'Clairance de la créatinine',
    category: 'nephrology',
    fields: [
      { id: 'creatinine', label: 'Créatinine (mg/dL)', type: 'number', placeholder: '1.0', step: '0.01' },
      { id: 'age', label: 'Âge (ans)', type: 'number', placeholder: '50' },
      { id: 'weight', label: 'Poids (kg)', type: 'number', placeholder: '70' },
      { id: 'gender', label: 'Sexe', type: 'select', options: [
        { value: 'male', label: 'Homme' },
        { value: 'female', label: 'Femme' }
      ]}
    ],
    calculate: (inputs): CalculatorResult => {
      const cr = parseFloat(inputs.creatinine || '0');
      const age = parseInt(inputs.age || '0');
      const weight = parseFloat(inputs.weight || '0');
      const isFemale = inputs.gender === 'female';
      
      if (cr <= 0 || age <= 0 || weight <= 0) {
        return { value: 0, unit: 'mL/min', interpretation: 'Données invalides', normalRange: '≥90', severity: 'normal' };
      }
      
      let clcr = ((140 - age) * weight) / (72 * cr);
      if (isFemale) clcr *= 0.85;
      
      let interpretation = '';
      let severity: 'low' | 'normal' | 'high' | 'critical' = 'normal';
      
      if (clcr >= 90) { interpretation = 'Fonction rénale normale'; severity = 'normal'; }
      else if (clcr >= 60) { interpretation = 'Insuffisance rénale légère'; severity = 'low'; }
      else if (clcr >= 30) { interpretation = 'Insuffisance rénale modérée'; severity = 'high'; }
      else if (clcr >= 15) { interpretation = 'Insuffisance rénale sévère'; severity = 'critical'; }
      else { interpretation = 'Insuffisance rénale terminale'; severity = 'critical'; }
      
      return {
        value: clcr.toFixed(1),
        unit: 'mL/min',
        interpretation,
        normalRange: '≥90 mL/min',
        severity
      };
    }
  },
  {
    id: 'fena',
    name: 'FENa (Excrétion Fractionnelle Na)',
    description: 'Différencie IRA prérénale vs rénale',
    category: 'nephrology',
    fields: [
      { id: 'una', label: 'Na urinaire (mEq/L)', type: 'number', placeholder: '40' },
      { id: 'pna', label: 'Na plasmatique (mEq/L)', type: 'number', placeholder: '140' },
      { id: 'ucr', label: 'Créatinine urinaire (mg/dL)', type: 'number', placeholder: '100' },
      { id: 'pcr', label: 'Créatinine plasmatique (mg/dL)', type: 'number', placeholder: '2.0', step: '0.1' }
    ],
    calculate: (inputs): CalculatorResult => {
      const una = parseFloat(inputs.una || '0');
      const pna = parseFloat(inputs.pna || '0');
      const ucr = parseFloat(inputs.ucr || '0');
      const pcr = parseFloat(inputs.pcr || '0');
      
      if (pna === 0 || ucr === 0) {
        return { value: 0, unit: '%', interpretation: 'Données invalides', normalRange: '<1%', severity: 'normal' };
      }
      
      const fena = ((una * pcr) / (pna * ucr)) * 100;
      
      let interpretation = '';
      let severity: 'low' | 'normal' | 'high' | 'critical' = 'normal';
      
      if (fena < 1) {
        interpretation = 'IRA prérénale probable (réponse rénale appropriée)';
        severity = 'low';
      } else if (fena < 2) {
        interpretation = 'Zone intermédiaire - contexte clinique important';
        severity = 'high';
      } else {
        interpretation = 'IRA rénale intrinsèque probable (NTA)';
        severity = 'critical';
      }
      
      return {
        value: fena.toFixed(2),
        unit: '%',
        interpretation,
        normalRange: '<1% (prérénale)',
        severity
      };
    }
  },
  {
    id: 'rfi',
    name: 'Renal Failure Index (RFI)',
    description: 'Indice d\'insuffisance rénale',
    category: 'nephrology',
    fields: [
      { id: 'una', label: 'Na urinaire (mEq/L)', type: 'number', placeholder: '40' },
      { id: 'ucr', label: 'Créatinine urinaire (mg/dL)', type: 'number', placeholder: '100' },
      { id: 'pcr', label: 'Créatinine plasmatique (mg/dL)', type: 'number', placeholder: '2.0', step: '0.1' }
    ],
    calculate: (inputs): CalculatorResult => {
      const una = parseFloat(inputs.una || '0');
      const ucr = parseFloat(inputs.ucr || '0');
      const pcr = parseFloat(inputs.pcr || '0');
      
      if (ucr === 0) {
        return { value: 0, unit: '', interpretation: 'Données invalides', normalRange: '<1', severity: 'normal' };
      }
      
      const rfi = una / (ucr / pcr);
      
      let interpretation = '';
      let severity: 'low' | 'normal' | 'high' | 'critical' = 'normal';
      
      if (rfi < 1) {
        interpretation = 'IRA prérénale probable';
        severity = 'low';
      } else {
        interpretation = 'NTA ou IRA rénale intrinsèque probable';
        severity = 'critical';
      }
      
      return {
        value: rfi.toFixed(2),
        unit: '',
        interpretation,
        normalRange: '<1 (prérénale)',
        severity
      };
    }
  }
];
