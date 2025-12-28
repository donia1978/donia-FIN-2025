const base = import.meta.env.VITE_AI_GATEWAY_URL || "http://localhost:5188";

export async function generateExamWithAI(payload: any) {
  const r = await fetch(`${base}/v1/exams/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!r.ok) {
    const t = await r.text().catch(() => "");
    throw new Error(t || `HTTP ${r.status}`);
  }
  return r.json();
}
