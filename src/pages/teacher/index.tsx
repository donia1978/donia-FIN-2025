import React, { useEffect, useState } from "react";
import { createCourse, listMyCourses, publishCourse, seedCoursesForMe } from "../../lib/courseService";

export default function TeacherDashboard() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<any[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    try {
      const data = await listMyCourses();
      setItems(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh().catch((e) => setMsg(String(e?.message || e)));
  }, []);

  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ fontSize: 22, fontWeight: 700 }}>Teacher Dashboard</h2>
      <p style={{ opacity: 0.8 }}>CrÃ©er / publier des cours + seed rapide</p>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", margin: "12px 0" }}>
        <button
          onClick={async () => {
            setMsg(null);
            try {
              await seedCoursesForMe();
              setMsg("Seed OK âœ…");
              await refresh();
            } catch (e: any) {
              setMsg(e?.message || String(e));
            }
          }}
          style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #ddd" }}
        >
          GO SEED COURSES
        </button>

        <button
          onClick={async () => {
            setMsg(null);
            try {
              await createCourse({ title: "Nouveau cours", cycle: "secondaire", status: "draft", price: 0 });
              setMsg("Cours crÃ©Ã© âœ…");
              await refresh();
            } catch (e: any) {
              setMsg(e?.message || String(e));
            }
          }}
          style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #ddd" }}
        >
          + CrÃ©er cours (draft)
        </button>

        <button
          onClick={() => refresh().catch((e) => setMsg(String(e?.message || e)))}
          style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #ddd" }}
        >
          RafraÃ®chir
        </button>
      </div>

      {msg ? <div style={{ marginBottom: 12, color: "#0f766e" }}>{msg}</div> : null}

      {loading ? (
        <div>Chargement...</div>
      ) : items.length === 0 ? (
        <div>Aucun cours (utilise SEED).</div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {items.map((c) => (
            <div key={c.id} style={{ border: "1px solid #e5e5e5", borderRadius: 12, padding: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                <div style={{ fontWeight: 700 }}>{c.title}</div>
                <div style={{ fontSize: 12, padding: "2px 8px", borderRadius: 999, background: "#f3f4f6" }}>{c.status}</div>
              </div>
              <div style={{ opacity: 0.8, marginTop: 6 }}>
                {c.cycle} {c.level ? `â€¢ ${c.level}` : ""} {c.category ? `â€¢ ${c.category}` : ""}
              </div>

              <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                {c.status !== "published" ? (
                  <button
                    onClick={async () => {
                      setMsg(null);
                      try {
                        await publishCourse(c.id);
                        setMsg("PubliÃ© âœ…");
                        await refresh();
                      } catch (e: any) {
                        setMsg(e?.message || String(e));
                      }
                    }}
                    style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #ddd" }}
                  >
                    Publier
                  </button>
                ) : null}
                <a href="/certificates" style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #ddd", textDecoration: "none" }}>
                  Certificats
                </a>
                <a href="/exams" style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #ddd", textDecoration: "none" }}>
                  Exam IA
                </a>
                <a href="/live" style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #ddd", textDecoration: "none" }}>
                  Live classes
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}