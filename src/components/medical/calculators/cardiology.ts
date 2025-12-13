import { CalculatorDefinition, CalculatorResult } from './types';

export const cardiologyCalculators: CalculatorDefinition[] = [
  {
    id: 'chads2vasc',
    name: 'CHA₂DS₂-VASc',
    description: 'Risque thromboembolique dans la FA',
    category: 'cardiology',
    fields: [
      { id: 'chf', label: 'Insuffisance cardiaque congestive', type: 'checkbox' },
      { id: 'hypertension', label: 'Hypertension', type: 'checkbox' },
      { id: 'age75', label: 'Âge ≥ 75 ans', type: 'checkbox' },
      { id: 'diabetes', label: 'Diabète', type: 'checkbox' },
      { id: 'stroke', label: 'AVC/AIT/Embolie antérieur', type: 'checkbox' },
      { id: 'vascular', label: 'Maladie vasculaire (IDM, AOMI, plaque aortique)', type: 'checkbox' },
      { id: 'age65', label: 'Âge 65-74 ans', type: 'checkbox' },
      { id: 'female', label: 'Sexe féminin', type: 'checkbox' }
    ],
    calculate: (inputs): CalculatorResult => {
      let score = 0;
      if (inputs.chf) score += 1;
      if (inputs.hypertension) score += 1;
      if (inputs.age75) score += 2;
      if (inputs.diabetes) score += 1;
      if (inputs.stroke) score += 2;
      if (inputs.vascular) score += 1;
      if (inputs.age65 && !inputs.age75) score += 1;
      if (inputs.female) score += 1;
      
      const riskRates: Record<number, string> = {
        0: '0%', 1: '1.3%', 2: '2.2%', 3: '3.2%', 4: '4.0%',
        5: '6.7%', 6: '9.8%', 7: '9.6%', 8: '12.5%', 9: '15.2%'
      };
      
      let severity: 'low' | 'normal' | 'high' | 'critical' = 'low';
      let recommendation = '';
      
      if (score === 0) {
        recommendation = 'Pas d\'anticoagulation recommandée';
        severity = 'low';
      } else if (score === 1) {
        recommendation = 'Anticoagulation à considérer';
        severity = 'normal';
      } else {
        recommendation = 'Anticoagulation recommandée (AOD ou AVK)';
        severity = score >= 4 ? 'critical' : 'high';
      }
      
      return {
        value: score,
        unit: '/9',
        interpretation: `Risque AVC/an: ${riskRates[Math.min(score, 9)]} - ${recommendation}`,
        normalRange: '0 (risque faible)',
        severity
      };
    }
  },
  {
    id: 'hasbled',
    name: 'HAS-BLED',
    description: 'Risque hémorragique sous anticoagulation',
    category: 'cardiology',
    fields: [
      { id: 'hypertension', label: 'Hypertension (PAS > 160 mmHg)', type: 'checkbox' },
      { id: 'renal', label: 'Insuffisance rénale (dialyse, transplant, créat > 200)', type: 'checkbox' },
      { id: 'liver', label: 'Insuffisance hépatique (cirrhose, bilirubine × 2)', type: 'checkbox' },
      { id: 'stroke', label: 'Antécédent d\'AVC', type: 'checkbox' },
      { id: 'bleeding', label: 'Antécédent ou prédisposition hémorragique', type: 'checkbox' },
      { id: 'inr', label: 'INR labile (< 60% dans la cible)', type: 'checkbox' },
      { id: 'age', label: 'Âge > 65 ans', type: 'checkbox' },
      { id: 'drugs', label: 'Médicaments (antiplaquettaires, AINS)', type: 'checkbox' },
      { id: 'alcohol', label: 'Alcool (≥ 8 verres/semaine)', type: 'checkbox' }
    ],
    calculate: (inputs): CalculatorResult => {
      let score = 0;
      if (inputs.hypertension) score++;
      if (inputs.renal) score++;
      if (inputs.liver) score++;
      if (inputs.stroke) score++;
      if (inputs.bleeding) score++;
      if (inputs.inr) score++;
      if (inputs.age) score++;
      if (inputs.drugs) score++;
      if (inputs.alcohol) score++;
      
      const riskRates: Record<number, string> = {
        0: '1.13%', 1: '1.02%', 2: '1.88%', 3: '3.74%', 4: '8.70%', 5: '12.50%'
      };
      
      let severity: 'low' | 'normal' | 'high' | 'critical' = 'low';
      let interpretation = '';
      
      if (score <= 2) {
        interpretation = `Risque faible - Hémorragie majeure/an: ${riskRates[score] || '>12%'}`;
        severity = 'low';
      } else {
        interpretation = `Risque élevé - Hémorragie majeure/an: ${riskRates[Math.min(score, 5)]} - Prudence avec anticoagulation`;
        severity = score >= 4 ? 'critical' : 'high';
      }
      
      return { value: score, unit: '/9', interpretation, normalRange: '0-2', severity };
    }
  },
  {
    id: 'grace',
    name: 'Score GRACE',
    description: 'Risque dans le syndrome coronarien aigu',
    category: 'cardiology',
    fields: [
      { id: 'age', label: 'Âge (ans)', type: 'number', placeholder: '65' },
      { id: 'hr', label: 'Fréquence cardiaque (bpm)', type: 'number', placeholder: '80' },
      { id: 'sbp', label: 'Pression artérielle systolique (mmHg)', type: 'number', placeholder: '130' },
      { id: 'creatinine', label: 'Créatinine (mg/dL)', type: 'number', placeholder: '1.0', step: '0.1' },
      {
        id: 'killip', label: 'Classe Killip', type: 'select',
        options: [
          { value: '1', label: 'Classe I - Pas de signe d\'IC' },
          { value: '2', label: 'Classe II - Râles, S3' },
          { value: '3', label: 'Classe III - OAP' },
          { value: '4', label: 'Classe IV - Choc cardiogénique' }
        ]
      },
      { id: 'cardiac_arrest', label: 'Arrêt cardiaque à l\'admission', type: 'checkbox' },
      { id: 'st_deviation', label: 'Déviation du segment ST', type: 'checkbox' },
      { id: 'elevated_markers', label: 'Marqueurs cardiaques élevés', type: 'checkbox' }
    ],
    calculate: (inputs): CalculatorResult => {
      const age = parseInt(inputs.age || '0');
      const hr = parseInt(inputs.hr || '0');
      const sbp = parseInt(inputs.sbp || '0');
      const creat = parseFloat(inputs.creatinine || '0');
      const killip = parseInt(inputs.killip || '1');
      
      // Simplified GRACE calculation
      let score = 0;
      
      // Age scoring
      if (age < 30) score += 0;
      else if (age < 40) score += 8;
      else if (age < 50) score += 25;
      else if (age < 60) score += 41;
      else if (age < 70) score += 58;
      else if (age < 80) score += 75;
      else if (age < 90) score += 91;
      else score += 100;
      
      // HR scoring
      if (hr < 50) score += 0;
      else if (hr < 70) score += 3;
      else if (hr < 90) score += 9;
      else if (hr < 110) score += 15;
      else if (hr < 150) score += 24;
      else if (hr < 200) score += 38;
      else score += 46;
      
      // SBP scoring
      if (sbp < 80) score += 58;
      else if (sbp < 100) score += 53;
      else if (sbp < 120) score += 43;
      else if (sbp < 140) score += 34;
      else if (sbp < 160) score += 24;
      else if (sbp < 200) score += 10;
      else score += 0;
      
      // Creatinine scoring
      if (creat < 0.4) score += 1;
      else if (creat < 0.8) score += 4;
      else if (creat < 1.2) score += 7;
      else if (creat < 1.6) score += 10;
      else if (creat < 2.0) score += 13;
      else if (creat < 4.0) score += 21;
      else score += 28;
      
      // Killip class
      score += (killip - 1) * 20;
      
      // Other factors
      if (inputs.cardiac_arrest) score += 39;
      if (inputs.st_deviation) score += 28;
      if (inputs.elevated_markers) score += 14;
      
      let risk = '';
      let severity: 'low' | 'normal' | 'high' | 'critical' = 'low';
      
      if (score <= 108) {
        risk = 'Risque faible (<1% mortalité hospitalière)';
        severity = 'low';
      } else if (score <= 140) {
        risk = 'Risque intermédiaire (1-3% mortalité)';
        severity = 'high';
      } else {
        risk = 'Risque élevé (>3% mortalité) - Stratégie invasive précoce';
        severity = 'critical';
      }
      
      return { value: score, unit: 'pts', interpretation: risk, normalRange: '≤108', severity };
    }
  },
  {
    id: 'timi',
    name: 'Score TIMI (NSTEMI)',
    description: 'Risque dans le NSTEMI/Angor instable',
    category: 'cardiology',
    fields: [
      { id: 'age65', label: 'Âge ≥ 65 ans', type: 'checkbox' },
      { id: 'risk_factors', label: '≥ 3 facteurs de risque CV', type: 'checkbox' },
      { id: 'known_cad', label: 'Sténose coronaire ≥ 50% connue', type: 'checkbox' },
      { id: 'aspirin', label: 'Aspirine dans les 7 derniers jours', type: 'checkbox' },
      { id: 'angina', label: '≥ 2 épisodes angineux en 24h', type: 'checkbox' },
      { id: 'st_deviation', label: 'Déviation ST ≥ 0.5mm', type: 'checkbox' },
      { id: 'elevated_markers', label: 'Marqueurs cardiaques élevés', type: 'checkbox' }
    ],
    calculate: (inputs): CalculatorResult => {
      let score = 0;
      if (inputs.age65) score++;
      if (inputs.risk_factors) score++;
      if (inputs.known_cad) score++;
      if (inputs.aspirin) score++;
      if (inputs.angina) score++;
      if (inputs.st_deviation) score++;
      if (inputs.elevated_markers) score++;
      
      const risks: Record<number, string> = {
        0: '4.7%', 1: '4.7%', 2: '8.3%', 3: '13.2%', 4: '19.9%', 5: '26.2%', 6: '40.9%', 7: '40.9%'
      };
      
      let severity: 'low' | 'normal' | 'high' | 'critical' = 'low';
      
      if (score <= 2) severity = 'low';
      else if (score <= 4) severity = 'high';
      else severity = 'critical';
      
      return {
        value: score,
        unit: '/7',
        interpretation: `Risque d'événement à 14j: ${risks[score]}`,
        normalRange: '0-2 (risque faible)',
        severity
      };
    }
  },
  {
    id: 'framingham',
    name: 'Score de Framingham',
    description: 'Risque cardiovasculaire à 10 ans',
    category: 'cardiology',
    fields: [
      { id: 'age', label: 'Âge (ans)', type: 'number', placeholder: '55' },
      { id: 'gender', label: 'Sexe', type: 'select', options: [
        { value: 'male', label: 'Homme' },
        { value: 'female', label: 'Femme' }
      ]},
      { id: 'total_chol', label: 'Cholestérol total (mg/dL)', type: 'number', placeholder: '200' },
      { id: 'hdl', label: 'HDL-C (mg/dL)', type: 'number', placeholder: '50' },
      { id: 'sbp', label: 'PAS (mmHg)', type: 'number', placeholder: '130' },
      { id: 'treated', label: 'Traitement antihypertenseur', type: 'checkbox' },
      { id: 'smoker', label: 'Fumeur actuel', type: 'checkbox' },
      { id: 'diabetes', label: 'Diabète', type: 'checkbox' }
    ],
    calculate: (inputs): CalculatorResult => {
      const age = parseInt(inputs.age || '0');
      const totalChol = parseInt(inputs.total_chol || '0');
      const hdl = parseInt(inputs.hdl || '0');
      const sbp = parseInt(inputs.sbp || '0');
      const isMale = inputs.gender === 'male';
      
      // Simplified Framingham calculation
      let points = 0;
      
      // Age points
      if (isMale) {
        if (age >= 70) points += 13;
        else if (age >= 65) points += 12;
        else if (age >= 60) points += 11;
        else if (age >= 55) points += 10;
        else if (age >= 50) points += 8;
        else if (age >= 45) points += 6;
        else if (age >= 40) points += 5;
        else if (age >= 35) points += 2;
      } else {
        if (age >= 75) points += 16;
        else if (age >= 70) points += 14;
        else if (age >= 65) points += 12;
        else if (age >= 60) points += 10;
        else if (age >= 55) points += 8;
        else if (age >= 50) points += 6;
        else if (age >= 45) points += 4;
        else if (age >= 40) points += 2;
      }
      
      // Total cholesterol
      if (totalChol >= 280) points += 3;
      else if (totalChol >= 240) points += 2;
      else if (totalChol >= 200) points += 1;
      
      // HDL
      if (hdl < 35) points += 2;
      else if (hdl < 45) points += 1;
      else if (hdl >= 60) points -= 1;
      
      // Blood pressure
      if (inputs.treated) {
        if (sbp >= 160) points += 3;
        else if (sbp >= 140) points += 2;
        else if (sbp >= 130) points += 1;
      } else {
        if (sbp >= 160) points += 2;
        else if (sbp >= 140) points += 1;
      }
      
      // Smoking
      if (inputs.smoker) points += 2;
      
      // Diabetes
      if (inputs.diabetes) points += isMale ? 2 : 4;
      
      // Calculate risk percentage (simplified)
      const riskPercent = Math.min(30, Math.max(1, points * 1.5));
      
      let severity: 'low' | 'normal' | 'high' | 'critical' = 'low';
      let category = '';
      
      if (riskPercent < 10) {
        category = 'Risque faible';
        severity = 'low';
      } else if (riskPercent < 20) {
        category = 'Risque intermédiaire';
        severity = 'high';
      } else {
        category = 'Risque élevé - Prévention intensive';
        severity = 'critical';
      }
      
      return {
        value: riskPercent.toFixed(1),
        unit: '%',
        interpretation: `${category} - Risque CV à 10 ans`,
        normalRange: '<10%',
        severity
      };
    }
  },
  {
    id: 'wells_dvt',
    name: 'Score de Wells (TVP)',
    description: 'Probabilité de thrombose veineuse profonde',
    category: 'cardiology',
    fields: [
      { id: 'active_cancer', label: 'Cancer actif', type: 'checkbox' },
      { id: 'paralysis', label: 'Paralysie/parésie ou immobilisation plâtrée MI', type: 'checkbox' },
      { id: 'bedridden', label: 'Alitement > 3j ou chirurgie majeure < 12 sem', type: 'checkbox' },
      { id: 'tenderness', label: 'Sensibilité localisée le long des veines profondes', type: 'checkbox' },
      { id: 'swelling', label: 'Œdème de tout le membre inférieur', type: 'checkbox' },
      { id: 'calf_swelling', label: 'Gonflement du mollet > 3 cm vs côté asymptomatique', type: 'checkbox' },
      { id: 'pitting_edema', label: 'Œdème prenant le godet', type: 'checkbox' },
      { id: 'collateral_veins', label: 'Veines superficielles collatérales', type: 'checkbox' },
      { id: 'previous_dvt', label: 'Antécédent de TVP', type: 'checkbox' },
      { id: 'alternative_diagnosis', label: 'Diagnostic alternatif au moins aussi probable', type: 'checkbox' }
    ],
    calculate: (inputs): CalculatorResult => {
      let score = 0;
      if (inputs.active_cancer) score += 1;
      if (inputs.paralysis) score += 1;
      if (inputs.bedridden) score += 1;
      if (inputs.tenderness) score += 1;
      if (inputs.swelling) score += 1;
      if (inputs.calf_swelling) score += 1;
      if (inputs.pitting_edema) score += 1;
      if (inputs.collateral_veins) score += 1;
      if (inputs.previous_dvt) score += 1;
      if (inputs.alternative_diagnosis) score -= 2;
      
      let probability = '';
      let severity: 'low' | 'normal' | 'high' | 'critical' = 'low';
      
      if (score <= 0) {
        probability = 'Probabilité faible (3%) - D-dimères recommandés';
        severity = 'low';
      } else if (score <= 2) {
        probability = 'Probabilité modérée (17%) - D-dimères puis écho si positifs';
        severity = 'high';
      } else {
        probability = 'Probabilité élevée (75%) - Écho-Doppler directe';
        severity = 'critical';
      }
      
      return { value: score, unit: 'pts', interpretation: probability, normalRange: '≤0', severity };
    }
  },
  {
    id: 'duke',
    name: 'Critères de Duke modifiés',
    description: 'Diagnostic de l\'endocardite infectieuse',
    category: 'cardiology',
    fields: [
      { id: 'positive_bc', label: 'Hémocultures positives typiques', type: 'checkbox' },
      { id: 'echo_positive', label: 'Échocardiogramme positif (végétation, abcès)', type: 'checkbox' },
      { id: 'new_regurgitation', label: 'Nouvelle insuffisance valvulaire', type: 'checkbox' },
      { id: 'predisposition', label: 'Facteur prédisposant (cardiopathie, drogue IV)', type: 'checkbox' },
      { id: 'fever', label: 'Fièvre > 38°C', type: 'checkbox' },
      { id: 'vascular', label: 'Phénomènes vasculaires (embolie, infarctus)', type: 'checkbox' },
      { id: 'immunologic', label: 'Phénomènes immunologiques (Osler, Roth, FR+)', type: 'checkbox' },
      { id: 'micro', label: 'Preuves microbiologiques autres', type: 'checkbox' }
    ],
    calculate: (inputs): CalculatorResult => {
      let major = 0;
      let minor = 0;
      
      // Major criteria
      if (inputs.positive_bc) major++;
      if (inputs.echo_positive) major++;
      if (inputs.new_regurgitation) major++;
      
      // Minor criteria
      if (inputs.predisposition) minor++;
      if (inputs.fever) minor++;
      if (inputs.vascular) minor++;
      if (inputs.immunologic) minor++;
      if (inputs.micro) minor++;
      
      let diagnosis = '';
      let severity: 'low' | 'normal' | 'high' | 'critical' = 'low';
      
      if (major >= 2 || (major === 1 && minor >= 3) || minor >= 5) {
        diagnosis = 'Endocardite DÉFINIE';
        severity = 'critical';
      } else if (major === 1 && minor >= 1 || minor >= 3) {
        diagnosis = 'Endocardite POSSIBLE - Investigation supplémentaire';
        severity = 'high';
      } else {
        diagnosis = 'Endocardite REJETÉE';
        severity = 'low';
      }
      
      return {
        value: `${major}M/${minor}m`,
        unit: '',
        interpretation: diagnosis,
        normalRange: 'Définitif: 2M ou 1M+3m ou 5m',
        severity
      };
    }
  }
];
