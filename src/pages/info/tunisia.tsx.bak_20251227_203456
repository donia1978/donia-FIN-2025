import { useEffect, useMemo, useState } from "react";

type Item = {
  title: string;
  link: string;
  publishedAt: string;
  summary: string;
  source: string;
};

const TABS = [
  { key: "politics", label: "Politique" },
  { key: "culture", label: "Culture" },
  { key: "sport", label: "Sport" }
] as const;

export default function TunisiaInfoPage() {
  const base = (import.meta as any).env?.VITE_INFO_PROXY_URL || "http://localhost:5178";
  const [tab, setTab] = useState<"politics" | "culture" | "sport">("politics");
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const url = useMemo(() => `${base}/api/info?category=${tab}&max=25`, [base, tab]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setErr(null);
    fetch(url)
      .then(r => r.json())
      .then(j => {
        if (!alive) return;
        setItems(Array.isArray(j?.items) ? j.items : []);
      })
      .catch(e => alive && setErr(String((e && (e.message || e)) || e)))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [url]);

  return (
    <div style={{ padding: 16, maxWidth: 1100, margin: "0 auto" }}>
      <h1 style={{ fontSize: 24, fontWeight: 800 }}>Tunisie â€” Infos</h1>
      <p style={{ opacity: 0.8, marginTop: 6 }}>
        Flux web tunisiens (Politique / Culture / Sport) avec attribution (source + lien).
      </p>

      <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: "8px 12px",
              borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.15)",
              background: tab === t.key ? "rgba(255,255,255,0.12)" : "transparent",
              cursor: "pointer"
            }}
          >
            {t.label}
          </button>
        ))}
        <a
          href={base + "/health"}
          target="_blank"
          rel="noreferrer"
          style={{ marginLeft: "auto", opacity: 0.8, textDecoration: "underline" }}
        >
          Proxy status
        </a>
      </div>

      {loading && <div style={{ marginTop: 16 }}>Chargementâ€¦</div>}
      {err && <div style={{ marginTop: 16, color: "#ffb4b4" }}>Erreur: {err}</div>}

      <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
        {items.map((it, idx) => (
          <article
            key={idx}
            style={{
              padding: 14,
              borderRadius: 14,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(0,0,0,0.18)"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <strong style={{ fontSize: 16 }}>{it.title}</strong>
              <span style={{ opacity: 0.75 }}>
                {it.source}{it.publishedAt ? " â€¢ " + it.publishedAt : ""}
              </span>
            </div>
            {it.summary && <p style={{ marginTop: 8, opacity: 0.9, lineHeight: 1.35 }}>{it.summary}</p>}
            <div style={{ marginTop: 10 }}>
              <a href={it.link} target="_blank" rel="noreferrer" style={{ textDecoration: "underline" }}>
                Source / Attribution
              </a>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}