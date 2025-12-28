export type TNExamPreset = {
  id: string;
  label: string;
  cycle: "primaire" | "college" | "lycee";
  niveau: string;
  matiere: string;
  langue: "fr" | "ar";
  dureeMin: number;
  nbExercices: number;
  format: "mix" | "problÃ¨mes" | "qcm" | "rÃ©daction";
  baremeTotal: number;
  competences: string[];
  structure: { titre: string; points: number; consigne: string }[];
};

export const TN_EXAM_PRESETS: TNExamPreset[] = [
  {
    id: "tn_primaire_math_6e",
    label: "Tunisie â€¢ Primaire â€¢ 6e â€¢ Math â€¢ 60 min",
    cycle: "primaire",
    niveau: "6e primaire",
    matiere: "MathÃ©matiques",
    langue: "fr",
    dureeMin: 60,
    nbExercices: 4,
    format: "mix",
    baremeTotal: 20,
    competences: [
      "Calcul (entiers, dÃ©cimaux, fractions)",
      "RÃ©solution de problÃ¨mes",
      "GÃ©omÃ©trie (angles, pÃ©rimÃ¨tre, aire)",
      "Organisation de donnÃ©es (tableaux, graphiques)"
    ],
    structure: [
      { titre: "Exercice 1 â€“ Calculs", points: 5, consigne: "Effectuer des calculs posÃ©s et/ou mental." },
      { titre: "Exercice 2 â€“ ProblÃ¨me", points: 6, consigne: "RÃ©soudre un problÃ¨me en justifiant les Ã©tapes." },
      { titre: "Exercice 3 â€“ GÃ©omÃ©trie", points: 5, consigne: "Tracer/mesurer et calculer pÃ©rimÃ¨tre/aire." },
      { titre: "Exercice 4 â€“ DonnÃ©es", points: 4, consigne: "Lire un tableau/graphique et rÃ©pondre." }
    ]
  },
  {
    id: "tn_college_math_9e",
    label: "Tunisie â€¢ CollÃ¨ge â€¢ 9e â€¢ Math â€¢ 90 min",
    cycle: "college",
    niveau: "9e (collÃ¨ge)",
    matiere: "MathÃ©matiques",
    langue: "fr",
    dureeMin: 90,
    nbExercices: 4,
    format: "problÃ¨mes",
    baremeTotal: 20,
    competences: [
      "AlgÃ¨bre (Ã©quations, expressions)",
      "GÃ©omÃ©trie (selon chapitre: triangles, ThalÃ¨s/Pythagore...)",
      "Fonctions / lecture graphique (selon progression)",
      "Raisonnement et justification"
    ],
    structure: [
      { titre: "Exercice 1 â€“ AlgÃ¨bre", points: 5, consigne: "Simplifier, factoriser, rÃ©soudre." },
      { titre: "Exercice 2 â€“ ProblÃ¨me", points: 6, consigne: "ModÃ©liser puis rÃ©soudre." },
      { titre: "Exercice 3 â€“ GÃ©omÃ©trie", points: 5, consigne: "Justifier les rÃ©sultats, soigner la figure." },
      { titre: "Exercice 4 â€“ InterprÃ©tation", points: 4, consigne: "Lire un graphique/situation et conclure." }
    ]
  },
  {
    id: "tn_primaire_arabe_5e",
    label: "ØªÙˆÙ†Ø³ â€¢ Ø§Ø¨ØªØ¯Ø§Ø¦ÙŠ â€¢ Ø®Ø§Ù…Ø³Ø© â€¢ Ø§Ù„Ø¹Ø±Ø¨ÙŠØ© â€¢ 60 Ø¯Ù‚ÙŠÙ‚Ø©",
    cycle: "primaire",
    niveau: "Ø§Ù„Ø®Ø§Ù…Ø³Ø© Ø§Ø¨ØªØ¯Ø§Ø¦ÙŠ",
    matiere: "Ø§Ù„Ù„ØºØ© Ø§Ù„Ø¹Ø±Ø¨ÙŠØ©",
    langue: "ar",
    dureeMin: 60,
    nbExercices: 3,
    format: "mix",
    baremeTotal: 20,
    competences: [
      "ÙÙ‡Ù… Ø§Ù„Ù…Ù‚Ø±ÙˆØ¡",
      "Ù‚ÙˆØ§Ø¹Ø¯ Ø§Ù„Ù„ØºØ©",
      "Ø§Ù„Ø¥Ù†ØªØ§Ø¬ Ø§Ù„ÙƒØªØ§Ø¨ÙŠ"
    ],
    structure: [
      { titre: "Ø§Ù„ØªÙ…Ø±ÙŠÙ† 1 â€“ ÙÙ‡Ù… Ù†Øµ", points: 8, consigne: "Ø§Ù„Ø¥Ø¬Ø§Ø¨Ø© Ø¹Ù† Ø£Ø³Ø¦Ù„Ø© Ø§Ù„ÙÙ‡Ù… Ù…Ø¹ Ø§Ù„ØªØ¹Ù„ÙŠÙ„." },
      { titre: "Ø§Ù„ØªÙ…Ø±ÙŠÙ† 2 â€“ Ù‚ÙˆØ§Ø¹Ø¯", points: 6, consigne: "ØªØ·Ø¨ÙŠÙ‚ Ù‚ÙˆØ§Ø¹Ø¯ Ù†Ø­ÙˆÙŠØ©/ØµØ±ÙÙŠØ© Ø­Ø³Ø¨ Ø§Ù„Ø¯Ø±Ø³." },
      { titre: "Ø§Ù„ØªÙ…Ø±ÙŠÙ† 3 â€“ Ø¥Ù†ØªØ§Ø¬ ÙƒØªØ§Ø¨ÙŠ", points: 6, consigne: "ÙƒØªØ§Ø¨Ø© ÙÙ‚Ø±Ø© Ù…Ù†Ø¸Ù…Ø© Ø¨Ø§Ø­ØªØ±Ø§Ù… Ø§Ù„Ù…Ø·Ù„ÙˆØ¨." }
    ]
  }
];