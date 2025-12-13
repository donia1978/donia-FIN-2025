import { CalculatorDefinition, CalculatorResult } from './types';

export const oncologyCalculators: CalculatorDefinition[] = [
  {
    id: 'gleason',
    name: 'Score de Gleason',
    description: 'Cancer de la prostate',
    category: 'oncology',
    fields: [
      {
        id: 'primary', label: 'Grade primaire (le plus fréquent)', type: 'select',
        options: [
          { value: '3', label: 'Grade 3 - Glandes bien formées' },
          { value: '4', label: 'Grade 4 - Glandes mal formées/fusionnées' },
          { value: '5', label: 'Grade 5 - Pas de formation glandulaire' }
        ]
      },
      {
        id: 'secondary', label: 'Grade secondaire', type: 'select',
        options: [
          { value: '3', label: 'Grade 3 - Glandes bien formées' },
          { value: '4', label: 'Grade 4 - Glandes mal formées/fusionnées' },
          { value: '5', label: 'Grade 5 - Pas de formation glandulaire' }
        ]
      }
    ],
    calculate: (inputs): CalculatorResult => {
      const primary = parseInt(inputs.primary || '3');
      const secondary = parseInt(inputs.secondary || '3');
      const total = primary + secondary;
      
      let grade = '';
      let prognosis = '';
      let severity: 'low' | 'normal' | 'high' | 'critical' = 'low';
      
      if (total <= 6) {
        grade = 'Grade Group 1';
        prognosis = 'Bien différencié - Surveillance active possible';
        severity = 'low';
      } else if (total === 7 && primary === 3) {
        grade = 'Grade Group 2';
        prognosis = 'Modérément différencié (favorable)';
        severity = 'high';
      } else if (total === 7 && primary === 4) {
        grade = 'Grade Group 3';
        prognosis = 'Modérément différencié (défavorable)';
        severity = 'high';
      } else if (total === 8) {
        grade = 'Grade Group 4';
        prognosis = 'Peu différencié - Traitement agressif';
        severity = 'critical';
      } else {
        grade = 'Grade Group 5';
        prognosis = 'Indifférencié - Haut risque';
        severity = 'critical';
      }
      
      return {
        value: `${primary}+${secondary}=${total}`,
        unit: '',
        interpretation: `${grade} - ${prognosis}`,
        normalRange: '≤6 (Grade Group 1)',
        severity
      };
    }
  },
  {
    id: 'nottingham',
    name: 'Score de Nottingham (SBR)',
    description: 'Grade histologique du cancer du sein',
    category: 'oncology',
    fields: [
      {
        id: 'tubule', label: 'Formation tubulaire', type: 'select',
        options: [
          { value: '1', label: '1 - Majoritaire (>75%)' },
          { value: '2', label: '2 - Modérée (10-75%)' },
          { value: '3', label: '3 - Minime ou absente (<10%)' }
        ]
      },
      {
        id: 'nuclear', label: 'Pléomorphisme nucléaire', type: 'select',
        options: [
          { value: '1', label: '1 - Noyaux réguliers, petits' },
          { value: '2', label: '2 - Noyaux modérément irréguliers' },
          { value: '3', label: '3 - Noyaux très irréguliers, gros' }
        ]
      },
      {
        id: 'mitosis', label: 'Compte mitotique', type: 'select',
        options: [
          { value: '1', label: '1 - Faible (0-5 mitoses/10 HPF)' },
          { value: '2', label: '2 - Intermédiaire (6-10 mitoses/10 HPF)' },
          { value: '3', label: '3 - Élevé (>10 mitoses/10 HPF)' }
        ]
      }
    ],
    calculate: (inputs): CalculatorResult => {
      const total = parseInt(inputs.tubule || '1') + parseInt(inputs.nuclear || '1') + 
                   parseInt(inputs.mitosis || '1');
      
      let grade = '';
      let prognosis = '';
      let severity: 'low' | 'normal' | 'high' | 'critical' = 'low';
      
      if (total <= 5) {
        grade = 'Grade I (bien différencié)';
        prognosis = 'Bon pronostic';
        severity = 'low';
      } else if (total <= 7) {
        grade = 'Grade II (modérément différencié)';
        prognosis = 'Pronostic intermédiaire';
        severity = 'high';
      } else {
        grade = 'Grade III (peu différencié)';
        prognosis = 'Pronostic réservé - Traitement adjuvant';
        severity = 'critical';
      }
      
      return {
        value: total,
        unit: '/9',
        interpretation: `${grade} - ${prognosis}`,
        normalRange: '3-5 (Grade I)',
        severity
      };
    }
  },
  {
    id: 'fuhrman',
    name: 'Grade de Fuhrman',
    description: 'Cancer du rein à cellules claires',
    category: 'oncology',
    fields: [
      {
        id: 'grade', label: 'Aspect nucléaire', type: 'select',
        options: [
          { value: '1', label: 'Grade 1 - Noyaux ronds, uniformes, ~10µm, nucléoles absents/peu visibles' },
          { value: '2', label: 'Grade 2 - Noyaux plus gros ~15µm, contours irréguliers, nucléoles visibles ×400' },
          { value: '3', label: 'Grade 3 - Noyaux encore plus gros ~20µm, très irréguliers, nucléoles visibles ×100' },
          { value: '4', label: 'Grade 4 - Noyaux bizarres, multilobés, amas chromatinemorphologie sarcomatoïde' }
        ]
      }
    ],
    calculate: (inputs): CalculatorResult => {
      const grade = parseInt(inputs.grade || '1');
      
      let prognosis = '';
      let survival = '';
      let severity: 'low' | 'normal' | 'high' | 'critical' = 'low';
      
      switch (grade) {
        case 1:
          prognosis = 'Excellent pronostic';
          survival = 'Survie 5 ans: ~90%';
          severity = 'low';
          break;
        case 2:
          prognosis = 'Bon pronostic';
          survival = 'Survie 5 ans: ~70%';
          severity = 'low';
          break;
        case 3:
          prognosis = 'Pronostic intermédiaire';
          survival = 'Survie 5 ans: ~50%';
          severity = 'high';
          break;
        case 4:
          prognosis = 'Mauvais pronostic';
          survival = 'Survie 5 ans: ~30%';
          severity = 'critical';
          break;
      }
      
      return {
        value: grade,
        unit: '/4',
        interpretation: `${prognosis} - ${survival}`,
        normalRange: 'Grade 1-2',
        severity
      };
    }
  },
  {
    id: 'bethesda',
    name: 'Classification Bethesda (thyroïde)',
    description: 'Cytologie des nodules thyroïdiens',
    category: 'oncology',
    fields: [
      {
        id: 'category', label: 'Catégorie Bethesda', type: 'select',
        options: [
          { value: '1', label: 'I - Non diagnostique/insatisfaisant' },
          { value: '2', label: 'II - Bénin' },
          { value: '3', label: 'III - Atypie/lésion folliculaire de signification indéterminée' },
          { value: '4', label: 'IV - Néoplasme folliculaire/suspect de néoplasme folliculaire' },
          { value: '5', label: 'V - Suspect de malignité' },
          { value: '6', label: 'VI - Malin' }
        ]
      }
    ],
    calculate: (inputs): CalculatorResult => {
      const category = parseInt(inputs.category || '1');
      
      const data: Record<number, { risk: string; action: string; severity: 'low' | 'normal' | 'high' | 'critical' }> = {
        1: { risk: '1-4%', action: 'Répéter ponction échoguidée', severity: 'low' },
        2: { risk: '0-3%', action: 'Suivi clinique et échographique', severity: 'normal' },
        3: { risk: '5-15%', action: 'Répéter ponction ou lobectomie', severity: 'high' },
        4: { risk: '15-30%', action: 'Lobectomie diagnostique', severity: 'high' },
        5: { risk: '60-75%', action: 'Thyroïdectomie totale ou lobectomie', severity: 'critical' },
        6: { risk: '97-99%', action: 'Thyroïdectomie totale', severity: 'critical' }
      };
      
      const info = data[category] || data[1];
      
      return {
        value: `Bethesda ${category}`,
        unit: '',
        interpretation: `Risque de malignité: ${info.risk} - ${info.action}`,
        normalRange: 'Bethesda II (bénin)',
        severity: info.severity
      };
    }
  },
  {
    id: 'tnm',
    name: 'Classification TNM',
    description: 'Stadification des tumeurs solides',
    category: 'oncology',
    fields: [
      {
        id: 't', label: 'T - Tumeur primitive', type: 'select',
        options: [
          { value: 'Tis', label: 'Tis - Carcinome in situ' },
          { value: 'T1', label: 'T1 - Tumeur ≤ 2 cm' },
          { value: 'T2', label: 'T2 - Tumeur 2-5 cm' },
          { value: 'T3', label: 'T3 - Tumeur > 5 cm' },
          { value: 'T4', label: 'T4 - Extension aux structures adjacentes' }
        ]
      },
      {
        id: 'n', label: 'N - Ganglions régionaux', type: 'select',
        options: [
          { value: 'N0', label: 'N0 - Pas d\'atteinte ganglionnaire' },
          { value: 'N1', label: 'N1 - Atteinte ganglionnaire limitée' },
          { value: 'N2', label: 'N2 - Atteinte ganglionnaire modérée' },
          { value: 'N3', label: 'N3 - Atteinte ganglionnaire extensive' }
        ]
      },
      {
        id: 'm', label: 'M - Métastases à distance', type: 'select',
        options: [
          { value: 'M0', label: 'M0 - Pas de métastases' },
          { value: 'M1', label: 'M1 - Métastases présentes' }
        ]
      }
    ],
    calculate: (inputs): CalculatorResult => {
      const t = inputs.t || 'T1';
      const n = inputs.n || 'N0';
      const m = inputs.m || 'M0';
      
      let stage = '';
      let severity: 'low' | 'normal' | 'high' | 'critical' = 'low';
      
      if (m === 'M1') {
        stage = 'Stade IV - Métastatique';
        severity = 'critical';
      } else if (t === 'Tis' && n === 'N0') {
        stage = 'Stade 0 - In situ';
        severity = 'low';
      } else if ((t === 'T1' || t === 'T2') && n === 'N0') {
        stage = 'Stade I-II - Localisé';
        severity = 'low';
      } else if (n !== 'N0') {
        if (n === 'N3' || t === 'T4') {
          stage = 'Stade IIIC - Localement avancé';
          severity = 'critical';
        } else {
          stage = 'Stade III - Atteinte régionale';
          severity = 'high';
        }
      } else {
        stage = 'Stade II - Localement avancé';
        severity = 'high';
      }
      
      return {
        value: `${t}${n}${m}`,
        unit: '',
        interpretation: stage,
        normalRange: 'Stade 0-I',
        severity
      };
    }
  }
];
