import React, { useMemo, useState } from "react";
import { generateExamWithAI } from "../../lib/examAiService";

type ExamForm = {
  country: "TN";
  cycle: "Primaire" | "Collège" | "Lycée";
  subject: string;
  level: string;
  chapter: string;
  evalType: "diagnostique" | "formative" | "sommative";
  format: "QCM" | "problèmes" | "rédaction" | "mix";
  minutes: number;
  n: number;
  language: "FR" | "AR";
  notes: string;
};

type Preset = {
  id: string;
  label: string;
  form: Partial<ExamForm>;
};

const DEFAULT_FORM: ExamForm = {
  country: "TN",
  cycle: "Collège",
  subject: "Mathématiques",
  level: "7e",
  chapter: "Fractions",
  evalType: "sommative",
  format: "mix",
  minutes: 60,
  n: 4,
  language: "FR",
  notes:
    "Conforme au programme tunisien. Inclure consignes générales, compétences, critères, barème. Progression graduée.",
};

export default function ExamGeneratorPage() {
  const [form, setForm] = useState<ExamForm>(DEFAULT_FORM);
  const [presetId, setPresetId] = useState<string>("tn_college_math_7_fractions");
  const [loading, setLoading] = useState(false);
  const [out, setOut] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);

  const presets: Preset[] = useMemo(
    () => [
      {
        id: "tn_college_math_7_fractions",
        label: "🇹🇳 Collège 7e — Math — Fractions (Mix, 60 min, 4 ex)",
        form: {
          cycle: "Collège",
          subject: "Mathématiques",
          level: "7e",
          chapter: "Fractions",
          evalType: "sommative",
          format: "mix",
          minutes: 60,
          n: 4,
          language: "FR",
        },
      },
      {
        id: "tn_primaire_fr_5_lecture",
        label: "🇹🇳 Primaire 5e — Français — Lecture/Compréhension (Mix, 45 min, 3 ex)",
        form: {
          cycle: "Primaire",
          subject: "Français",
          level: "5e",
          chapter: "Compréhension de texte",
          evalType: "sommative",
          format: "mix",
          minutes: 45,
          n: 3,
          language: "FR",
          notes:
            "Texte adapté au niveau, questions de compréhension (explicite/implicite), vocabulaire, production courte. Barème clair.",
        },
      },
      {
        id: "tn_primaire_math_6_problemes",
        label: "🇹🇳 Primaire 6e — Math — Problèmes (Problèmes, 60 min, 4 ex)",
        form: {
          cycle: "Primaire",
          subject: "Mathématiques",
          level: "6e",
          chapter: "Problèmes (mesures, opérations, logique)",
          evalType: "sommative",
          format: "problèmes",
          minutes: 60,
          n: 4,
          language: "FR",
          notes:
            "Problèmes contextualisés (Tunisie), calculs, unités, raisonnement. Barème total 20 points.",
        },
      },
      {
        id: "tn_college_ar_8_langue",
        label: "🇹🇳 Collège 8e — العربية — اللغة (Mix, 60 min, 4 ex)",
        form: {
          cycle: "Collège",
          subject: "اللغة العربية",
          level: "8e",
          chapter: "فهم نص + قواعد + تعبير كتابي",
          evalType: "sommative",
          format: "mix",
          minutes: 60,
          n: 4,
          language: "AR",
          notes:
            "احترام مستوى التلاميذ. أقسام: تعليمات عامة، كفاءات، معايير نجاح، سلم تقييم. أسئلة فهم + قواعد + إنتاج كتابي قصير.",
        },
      },
    ],
    []
  );

  const applyPreset = (id: string) => {
    const p = presets.find((x) => x.id === id);
    if (!p) return;
    setPresetId(id);
    setForm((prev) => ({
      ...prev,
      ...p.form,
      country: "TN",
    }));
    setErr(null);
    setOut(null);
  };

  const setField = <K extends keyof ExamForm>(key: K, value: ExamForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const onGenerate = async () => {
    setErr(null);
    setOut(null);

    // validations 100% state-driven
    if (!form.subject.trim()) return setErr("Matière obligatoire.");
    if (!form.level.trim()) return setErr("Niveau obligatoire.");
    if (!form.chapter.trim()) return setErr("Chapitre/Notion obligatoire.");
    if (!Number.isFinite(form.minutes) || form.minutes < 10 || form.minutes > 240)
      return setErr("Durée invalide (10–240 minutes).");
    if (!Number.isFinite(form.n) || form.n < 1 || form.n > 20)
      return setErr("Nombre d'exercices invalide (1–20).");

    try {
      setLoading(true);

      const payload = {
        // champs “métier”
        matiere: form.subject,
        niveau: `${form.cycle} ${form.level}`.trim(),
        chapitre: form.chapter,
        type: form.evalType,
        format: form.format,
        minutes: form.minutes,
        n: form.n,
        langue: form.language === "AR" ? "ar" : "fr",

        // contexte Tunisie + notes
        country: form.country,
        notes: form.notes,
        preset: presetId,
      };

      const r = await generateExamWithAI(payload as any);
      setOut(r);
    } catch (e: any) {
      setErr(e?.message || "Erreur IA.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 16, maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <h2 style={{ fontSize: 22, fontWeight: 800 }}>Exam Generator IA (🇹🇳 Presets officiels)</h2>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <label style={{ fontSize: 12, opacity: 0.8 }}>Preset</label>
          <select
            value={presetId}
            onChange={(e) => applyPreset(e.target.value)}
            style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #e5e7eb" }}
            disabled={loading}
          >
            {presets.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
          <button
            onClick={() => applyPreset(presetId)}
            disabled={loading}
            style={{
              padding: "8px 12px",
              borderRadius: 10,
              border: "1px solid #e5e7eb",
              background: "#fff",
              cursor: "pointer",
              fontWeight: 600,
            }}
            title="Ré-appliquer le preset"
          >
            Appliquer
          </button>
        </div>
      </div>

      <div
        style={{
          marginTop: 14,
          display: "grid",
          gridTemplateColumns: "repeat(12, 1fr)",
          gap: 12,
          alignItems: "start",
        }}
      >
        <div style={{ gridColumn: "span 7", border: "1px solid #e5e7eb", borderRadius: 14, padding: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 10 }}>
            <Field label="Pays" col={2}>
              <input value={form.country} readOnly style={inputStyle} />
            </Field>

            <Field label="Cycle" col={2}>
              <select
                value={form.cycle}
                onChange={(e) => setField("cycle", e.target.value as ExamForm["cycle"])}
                style={inputStyle}
                disabled={loading}
              >
                <option value="Primaire">Primaire</option>
                <option value="Collège">Collège</option>
                <option value="Lycée">Lycée</option>
              </select>
            </Field>

            <Field label="Langue" col={2}>
              <select
                value={form.language}
                onChange={(e) => setField("language", e.target.value as ExamForm["language"])}
                style={inputStyle}
                disabled={loading}
              >
                <option value="FR">FR</option>
                <option value="AR">AR</option>
              </select>
            </Field>

            <Field label="Matière" col={3}>
              <input
                value={form.subject}
                onChange={(e) => setField("subject", e.target.value)}
                style={inputStyle}
                disabled={loading}
              />
            </Field>

            <Field label="Niveau" col={3}>
              <input
                value={form.level}
                onChange={(e) => setField("level", e.target.value)}
                style={inputStyle}
                disabled={loading}
              />
            </Field>

            <Field label="Chapitre / Notion" col={6}>
              <input
                value={form.chapter}
                onChange={(e) => setField("chapter", e.target.value)}
                style={inputStyle}
                disabled={loading}
              />
            </Field>

            <Field label="Type d'évaluation" col={3}>
              <select
                value={form.evalType}
                onChange={(e) => setField("evalType", e.target.value as ExamForm["evalType"])}
                style={inputStyle}
                disabled={loading}
              >
                <option value="diagnostique">diagnostique</option>
                <option value="formative">formative</option>
                <option value="sommative">sommative</option>
              </select>
            </Field>

            <Field label="Format" col={3}>
              <select
                value={form.format}
                onChange={(e) => setField("format", e.target.value as ExamForm["format"])}
                style={inputStyle}
                disabled={loading}
              >
                <option value="QCM">QCM</option>
                <option value="problèmes">problèmes</option>
                <option value="rédaction">rédaction</option>
                <option value="mix">mix</option>
              </select>
            </Field>

            <Field label="Durée (min)" col={3}>
              <input
                type="number"
                value={String(form.minutes)}
                onChange={(e) => setField("minutes", clampInt(e.target.value, 10, 240, 60))}
                style={inputStyle}
                disabled={loading}
                min={10}
                max={240}
              />
            </Field>

            <Field label="Exercices" col={3}>
              <input
                type="number"
                value={String(form.n)}
                onChange={(e) => setField("n", clampInt(e.target.value, 1, 20, 4))}
                style={inputStyle}
                disabled={loading}
                min={1}
                max={20}
              />
            </Field>

            <Field label="Notes / Contraintes" col={6}>
              <textarea
                value={form.notes}
                onChange={(e) => setField("notes", e.target.value)}
                style={{ ...inputStyle, minHeight: 120, resize: "vertical" }}
                disabled={loading}
              />
            </Field>
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 12, alignItems: "center" }}>
            <button
              onClick={onGenerate}
              disabled={loading}
              style={{
                padding: "10px 14px",
                borderRadius: 12,
                border: "1px solid #0ea5e9",
                background: "#0ea5e9",
                color: "white",
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              {loading ? "Génération..." : "Générer"}
            </button>

            <button
              onClick={() => {
                setForm(DEFAULT_FORM);
                setPresetId("tn_college_math_7_fractions");
                setErr(null);
                setOut(null);
              }}
              disabled={loading}
              style={{
                padding: "10px 14px",
                borderRadius: 12,
                border: "1px solid #e5e7eb",
                background: "#fff",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Reset
            </button>

            {err ? <div style={{ color: "#b91c1c", fontWeight: 700 }}>{err}</div> : null}
          </div>
        </div>

        <div style={{ gridColumn: "span 5", border: "1px solid #e5e7eb", borderRadius: 14, padding: 14 }}>
          <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 10 }}>Résultat</h3>
          {out ? (
            <pre
              style={{
                whiteSpace: "pre-wrap",
                background: "#0b1020",
                color: "#e5e7eb",
                padding: 12,
                borderRadius: 12,
                minHeight: 280,
              }}
            >
              {JSON.stringify(out, null, 2)}
            </pre>
          ) : (
            <div style={{ opacity: 0.7 }}>
              Lance une génération pour afficher le JSON (examen / planification / fiche selon ton API).
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Field(props: { label: string; col: number; children: React.ReactNode }) {
  return (
    <div style={{ gridColumn: `span ${props.col}` }}>
      <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, opacity: 0.85 }}>{props.label}</div>
      {props.children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 10px",
  borderRadius: 10,
  border: "1px solid #e5e7eb",
  outline: "none",
  fontSize: 14,
};

function clampInt(raw: string, min: number, max: number, fallback: number) {
  const v = parseInt(String(raw ?? "").trim(), 10);
  if (!Number.isFinite(v)) return fallback;
  return Math.max(min, Math.min(max, v));
}
