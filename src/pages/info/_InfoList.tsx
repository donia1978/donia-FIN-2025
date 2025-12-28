import React, { useEffect, useMemo, useState } from "react";
import { InfoCategory, InfoItem, listInfo } from "../../lib/infoService";

function Badge({ text }: { text: string }) {
  return <span style={{ fontSize: 12, padding: "2px 8px", borderRadius: 999, background: "#f3f4f6" }}>{text}</span>;
}

function MediaCard({ item }: { item: InfoItem }) {
  if (!item.media_url || item.media_type === "none") return null;

  if (item.media_type === "image") {
    return (
      <div style={{ marginTop: 10 }}>
        <img src={item.media_url} alt={item.title} style={{ width: "100%", borderRadius: 12, border: "1px solid #e5e5e5" }} />
      </div>
    );
  }

  if (item.media_type === "video") {
    return (
      <div style={{ marginTop: 10 }}>
        <video controls style={{ width: "100%", borderRadius: 12, border: "1px solid #e5e5e5" }}>
          <source src={item.media_url} />
        </video>
      </div>
    );
  }

  return null;
}

export default function InfoList({ category }: { category: InfoCategory }) {
  const [country, setCountry] = useState("TN");
  const [q, setQ] = useState("");
  const [items, setItems] = useState<InfoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setErr(null);
        setLoading(true);
        const data = await listInfo(category, country);
        setItems(data);
      } catch (e: any) {
        setErr(e?.message || String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, [category, country]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return items;
    return items.filter((it) =>
      [it.title, it.summary, it.location, (it.tags || []).join(" "), it.source_name].join(" ").toLowerCase().includes(s)
    );
  }, [items, q]);

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>
          Informations â€¢ {category === "culture" ? "Culture" : category === "sport" ? "Sport" : "Politique"}
        </h2>
        <Badge text="mÃ©dias + attribution" />
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10 }}>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher..." style={{ padding: 10, borderRadius: 8, border: "1px solid #ddd", minWidth: 260 }} />
        <input value={country} onChange={(e) => setCountry(e.target.value.toUpperCase())} placeholder="Pays (ex: TN)" style={{ padding: 10, borderRadius: 8, border: "1px solid #ddd", width: 120 }} />
        <a href="/admin" style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #ddd", textDecoration: "none" }}>
          Admin (publier)
        </a>
      </div>

      {err ? <div style={{ marginTop: 10, color: "#b91c1c" }}>{err}</div> : null}
      {loading ? (
        <div style={{ marginTop: 10 }}>Chargement...</div>
      ) : filtered.length === 0 ? (
        <div style={{ marginTop: 10 }}>Aucun contenu. Ajoute via Admin.</div>
      ) : (
        <div style={{ marginTop: 12, display: "grid", gap: 12 }}>
          {filtered.map((it) => (
            <div key={it.id} style={{ border: "1px solid #e5e5e5", borderRadius: 14, padding: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                <div style={{ fontWeight: 800 }}>{it.title}</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <Badge text={it.country} />
                  <Badge text={it.status} />
                  {it.event_date ? <Badge text={new Date(it.event_date).toLocaleDateString()} /> : null}
                </div>
              </div>

              {it.location ? <div style={{ marginTop: 6, opacity: 0.8 }}>ðŸ“ {it.location}</div> : null}
              {typeof it.price_min === "number" || typeof it.price_max === "number" ? (
                <div style={{ marginTop: 6, opacity: 0.9 }}>
                  ðŸ’³ Prix : {it.price_min ?? 0} â€“ {it.price_max ?? it.price_min ?? 0} {it.currency ?? "TND"}
                </div>
              ) : null}

              {it.summary ? <div style={{ marginTop: 10, opacity: 0.9 }}>{it.summary}</div> : null}

              <MediaCard item={it} />

              <div style={{ marginTop: 10, fontSize: 12, opacity: 0.85 }}>
                <div>Source : <a href={it.source_url} target="_blank" rel="noreferrer">{it.source_name}</a></div>
                <div>Licence : <a href={it.license_url} target="_blank" rel="noreferrer">{it.license_name}</a></div>
                <div>Attribution : {it.attribution_text}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}