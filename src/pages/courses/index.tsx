import React, { useEffect, useMemo, useState } from "react";
import { listPublishedCourses } from "../../lib/courseService";

export default function CoursesPage() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<any[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const data = await listPublishedCourses();
        setItems(data);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return items;
    return items.filter((c) =>
      [c.title, c.cycle, c.level, c.category, (c.tags || []).join(" ")]
        .join(" ")
        .toLowerCase()
        .includes(s)
    );
  }, [items, q]);

  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ fontSize: 22, fontWeight: 700 }}>Cours en ligne</h2>
      <p style={{ opacity: 0.8 }}>Catalogue public (published)</p>

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Rechercher (titre, niveau, tags...)"
        style={{ width: "100%", padding: 10, margin: "12px 0", borderRadius: 8, border: "1px solid #ddd" }}
      />

      {loading ? (
        <div>Chargement...</div>
      ) : filtered.length === 0 ? (
        <div>Aucun cours.</div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {filtered.map((c) => (
            <div key={c.id} style={{ border: "1px solid #e5e5e5", borderRadius: 12, padding: 12 }}>
              <div style={{ fontWeight: 700 }}>{c.title}</div>
              <div style={{ opacity: 0.8 }}>
                {c.cycle} {c.level ? `â€¢ ${c.level}` : ""} {c.category ? `â€¢ ${c.category}` : ""}
              </div>
              <div style={{ marginTop: 6 }}>
                <span style={{ fontWeight: 700 }}>{c.price ?? 0}</span> {c.currency ?? "TND"} â€¢ {c.mode ?? "replay"} â€¢{" "}
                {c.billing_model ?? "one_time"}
              </div>
              {c.description ? <div style={{ marginTop: 8, opacity: 0.85 }}>{c.description}</div> : null}
              {Array.isArray(c.tags) && c.tags.length ? (
                <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {c.tags.map((t: string) => (
                    <span key={t} style={{ fontSize: 12, padding: "2px 8px", borderRadius: 999, background: "#f3f4f6" }}>
                      {t}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}