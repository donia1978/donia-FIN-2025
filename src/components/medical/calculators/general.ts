import { CalculatorDefinition, CalculatorResult } from './types';

export const generalCalculators: CalculatorDefinition[] = [
  {
    id: 'bmi',
    name: 'IMC (Indice de Masse Corporelle)',
    description: 'Évaluation du statut pondéral',
    category: 'general',
    fields: [
      { id: 'weight', label: 'Poids (kg)', type: 'number', placeholder: '70' },
      { id: 'height', label: 'Taille (cm)', type: 'number', placeholder: '175' }
    ],
    calculate: (inputs): CalculatorResult => {
      const weight = parseFloat(inputs.weight || '0');
      const height = parseFloat(inputs.height || '0') / 100;
      
      if (weight <= 0 || height <= 0) {
        return { value: 0, unit: 'kg/m²', interpretation: 'Données invalides', normalRange: '18.5-24.9', severity: 'normal' };
      }
      
      const bmi = weight / (height * height);
      let interpretation = '';
      let severity: 'low' | 'normal' | 'high' | 'critical' = 'normal';
      
      if (bmi < 16) { interpretation = 'Dénutrition sévère'; severity = 'critical'; }
      else if (bmi < 17) { interpretation = 'Dénutrition modérée'; severity = 'high'; }
      else if (bmi < 18.5) { interpretation = 'Dénutrition légère'; severity = 'low'; }
      else if (bmi < 25) { interpretation = 'Poids normal'; severity = 'normal'; }
      else if (bmi < 30) { interpretation = 'Surpoids'; severity = 'low'; }
      else if (bmi < 35) { interpretation = 'Obésité classe I'; severity = 'high'; }
      else if (bmi < 40) { interpretation = 'Obésité classe II'; severity = 'high'; }
      else { interpretation = 'Obésité classe III (morbide)'; severity = 'critical'; }
      
      return {
        value: bmi.toFixed(1),
        unit: 'kg/m²',
        interpretation,
        normalRange: '18.5-24.9 kg/m²',
        severity
      };
    }
  },
  {
    id: 'bsa',
    name: 'Surface Corporelle',
    description: 'Formule de Du Bois',
    category: 'general',
    fields: [
      { id: 'weight', label: 'Poids (kg)', type: 'number', placeholder: '70' },
      { id: 'height', label: 'Taille (cm)', type: 'number', placeholder: '175' }
    ],
    calculate: (inputs): CalculatorResult => {
      const weight = parseFloat(inputs.weight || '0');
      const height = parseFloat(inputs.height || '0');
      
      if (weight <= 0 || height <= 0) {
        return { value: 0, unit: 'm²', interpretation: 'Données invalides', normalRange: '1.7-2.0', severity: 'normal' };
      }
      
      // Du Bois formula
      const bsa = 0.007184 * Math.pow(weight, 0.425) * Math.pow(height, 0.725);
      
      return {
        value: bsa.toFixed(2),
        unit: 'm²',
        interpretation: `Surface corporelle pour dosage des chimiothérapies`,
        normalRange: '1.7-2.0 m² (adulte moyen)',
        severity: 'normal'
      };
    }
  },
  {
    id: 'pediatric_dose',
    name: 'Dosage Pédiatrique',
    description: 'Calcul de dose selon le poids',
    category: 'general',
    fields: [
      { id: 'weight', label: 'Poids de l\'enfant (kg)', type: 'number', placeholder: '15' },
      { id: 'adult_dose', label: 'Dose adulte (mg)', type: 'number', placeholder: '500' },
      { id: 'method', label: 'Méthode de calcul', type: 'select', options: [
        { value: 'clark', label: 'Règle de Clark (par poids)' },
        { value: 'young', label: 'Règle de Young (par âge)' },
        { value: 'bsa', label: 'Par surface corporelle' }
      ]},
      { id: 'age', label: 'Âge (ans) - pour Young', type: 'number', placeholder: '6' },
      { id: 'height', label: 'Taille (cm) - pour BSA', type: 'number', placeholder: '100' }
    ],
    calculate: (inputs): CalculatorResult => {
      const weight = parseFloat(inputs.weight || '0');
      const adultDose = parseFloat(inputs.adult_dose || '0');
      const age = parseFloat(inputs.age || '0');
      const height = parseFloat(inputs.height || '0');
      const method = inputs.method || 'clark';
      
      let dose = 0;
      let formula = '';
      
      switch (method) {
        case 'clark':
          dose = (weight / 70) * adultDose;
          formula = 'Clark: (Poids enfant / 70) × Dose adulte';
          break;
        case 'young':
          dose = (age / (age + 12)) * adultDose;
          formula = 'Young: (Âge / (Âge + 12)) × Dose adulte';
          break;
        case 'bsa':
          const bsa = 0.007184 * Math.pow(weight, 0.425) * Math.pow(height, 0.725);
          dose = (bsa / 1.73) * adultDose;
          formula = 'BSA: (SC enfant / 1.73) × Dose adulte';
          break;
      }
      
      return {
        value: dose.toFixed(1),
        unit: 'mg',
        interpretation: `Méthode: ${formula}`,
        normalRange: 'Vérifier avec les recommandations du médicament',
        severity: 'normal'
      };
    }
  },
  {
    id: 'homa_ir',
    name: 'HOMA-IR',
    description: 'Résistance à l\'insuline',
    category: 'general',
    fields: [
      { id: 'glucose', label: 'Glycémie à jeun (mmol/L)', type: 'number', placeholder: '5.0', step: '0.1' },
      { id: 'insulin', label: 'Insulinémie à jeun (µU/mL)', type: 'number', placeholder: '10', step: '0.1' }
    ],
    calculate: (inputs): CalculatorResult => {
      const glucose = parseFloat(inputs.glucose || '0');
      const insulin = parseFloat(inputs.insulin || '0');
      
      if (glucose <= 0 || insulin <= 0) {
        return { value: 0, unit: '', interpretation: 'Données invalides', normalRange: '<2.5', severity: 'normal' };
      }
      
      const homa = (glucose * insulin) / 22.5;
      
      let interpretation = '';
      let severity: 'low' | 'normal' | 'high' | 'critical' = 'normal';
      
      if (homa < 1) {
        interpretation = 'Sensibilité normale à l\'insuline';
        severity = 'normal';
      } else if (homa < 2.5) {
        interpretation = 'Résistance à l\'insuline légère';
        severity = 'low';
      } else if (homa < 4) {
        interpretation = 'Résistance à l\'insuline modérée';
        severity = 'high';
      } else {
        interpretation = 'Résistance à l\'insuline sévère';
        severity = 'critical';
      }
      
      return {
        value: homa.toFixed(2),
        unit: '',
        interpretation,
        normalRange: '<2.5',
        severity
      };
    }
  },
  {
    id: 'quicki',
    name: 'QUICKI',
    description: 'Quantitative Insulin Sensitivity Check Index',
    category: 'general',
    fields: [
      { id: 'glucose', label: 'Glycémie à jeun (mg/dL)', type: 'number', placeholder: '90' },
      { id: 'insulin', label: 'Insulinémie à jeun (µU/mL)', type: 'number', placeholder: '10', step: '0.1' }
    ],
    calculate: (inputs): CalculatorResult => {
      const glucose = parseFloat(inputs.glucose || '0');
      const insulin = parseFloat(inputs.insulin || '0');
      
      if (glucose <= 0 || insulin <= 0) {
        return { value: 0, unit: '', interpretation: 'Données invalides', normalRange: '>0.357', severity: 'normal' };
      }
      
      const quicki = 1 / (Math.log10(glucose) + Math.log10(insulin));
      
      let interpretation = '';
      let severity: 'low' | 'normal' | 'high' | 'critical' = 'normal';
      
      if (quicki > 0.357) {
        interpretation = 'Sensibilité normale à l\'insuline';
        severity = 'normal';
      } else if (quicki > 0.339) {
        interpretation = 'Résistance à l\'insuline légère';
        severity = 'low';
      } else {
        interpretation = 'Résistance à l\'insuline significative';
        severity = 'high';
      }
      
      return {
        value: quicki.toFixed(3),
        unit: '',
        interpretation,
        normalRange: '>0.357',
        severity
      };
    }
  }
];
