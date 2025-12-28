param(
  [string]$Root = "C:\lovable\doniasocial"
)

$ErrorActionPreference = "Stop"

function Info($m){ Write-Host "[INFO] $m" -ForegroundColor Cyan }
function Ok($m){ Write-Host "[OK]  $m" -ForegroundColor Green }
function Warn($m){ Write-Host "[WARN] $m" -ForegroundColor Yellow }
function Die($m){ Write-Host "[ERR] $m" -ForegroundColor Red; throw $m }

if(!(Test-Path -LiteralPath $Root)){ Die "Root not found: $Root" }
Set-Location $Root

function Ensure-Dir([string]$p){
  if(!(Test-Path -LiteralPath $p)){
    New-Item -ItemType Directory -Force -Path $p | Out-Null
    Ok "DIR  + $p"
  }
}

function Write-UTF8([string]$path, [string]$content){
  $dir = Split-Path -Parent $path
  if($dir -and !(Test-Path -LiteralPath $dir)){ New-Item -ItemType Directory -Force -Path $dir | Out-Null }
  [System.IO.File]::WriteAllText($path, $content, [System.Text.Encoding]::UTF8)
  Ok "WRITE $path"
}

function Read-Text([string]$path){
  if(!(Test-Path -LiteralPath $path)){ return $null }
  return [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)
}

# -------------------------------
# 0) Ensure folders
# -------------------------------
Ensure-Dir (Join-Path $Root "src\lib")
Ensure-Dir (Join-Path $Root "src\pages")
Ensure-Dir (Join-Path $Root "src\pages\courses")
Ensure-Dir (Join-Path $Root "src\pages\teacher")
Ensure-Dir (Join-Path $Root "src\pages\exams")
Ensure-Dir (Join-Path $Root "src\pages\certificates")
Ensure-Dir (Join-Path $Root "src\pages\live")
Ensure-Dir (Join-Path $Root "docs")

# -------------------------------
# 1) Ensure supabaseClient.ts exists (minimal)
# -------------------------------
$sbPath = Join-Path $Root "src\lib\supabaseClient.ts"
if(!(Test-Path -LiteralPath $sbPath)){
  $sb = @'
import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string;
const anon = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

if (!url || !anon) {
  // eslint-disable-next-line no-console
  console.warn("Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY in .env");
}

export const supabase = createClient(url, anon, {
  auth: { persistSession: true, autoRefreshToken: true },
});
'@
  Write-UTF8 $sbPath $sb
} else {
  Ok "supabaseClient.ts exists"
}

# -------------------------------
# 2) Fix/Write Services
# -------------------------------

# 2.1 Course service (list/create + seed helper)
Write-UTF8 (Join-Path $Root "src\lib\courseService.ts") @'
import { supabase } from "./supabaseClient";

export type Course = {
  id: string;
  teacher_id: string;
  title: string;
  cycle: string;
  level?: string | null;
  category?: string | null;
  lang?: string | null;
  price?: number | null;
  currency?: string | null;
  billing_model?: string | null;
  mode?: string | null;
  description?: string | null;
  status: string;
  tags?: string[] | null;
  created_at?: string;
};

export async function getMe() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  return data.user;
}

export async function listMyCourses(): Promise<Course[]> {
  const me = await getMe();
  const { data, error } = await supabase
    .from("courses")
    .select("*")
    .eq("teacher_id", me.id)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Course[];
}

export async function listPublishedCourses(): Promise<Course[]> {
  const { data, error } = await supabase
    .from("courses")
    .select("*")
    .eq("status", "published")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Course[];
}

export async function createCourse(input: Partial<Course>) {
  const me = await getMe();
  const payload = {
    teacher_id: me.id,
    title: input.title ?? "New course",
    cycle: input.cycle ?? "secondaire",
    level: input.level ?? null,
    category: input.category ?? null,
    lang: input.lang ?? "fr",
    price: input.price ?? 0,
    currency: input.currency ?? "TND",
    billing_model: input.billing_model ?? "one_time",
    mode: input.mode ?? "replay",
    description: input.description ?? null,
    status: input.status ?? "draft",
    tags: input.tags ?? [],
  };

  const { data, error } = await supabase.from("courses").insert(payload).select("*").single();
  if (error) throw error;
  return data as Course;
}

export async function publishCourse(courseId: string) {
  const { data, error } = await supabase
    .from("courses")
    .update({ status: "published" })
    .eq("id", courseId)
    .select("*")
    .single();
  if (error) throw error;
  return data as Course;
}

export async function seedCoursesForMe() {
  const me = await getMe();
  const nowTag = new Date().toISOString().slice(0, 10);

  const seeds = [
    {
      teacher_id: me.id,
      title: "Math – Révision (Collège) " + nowTag,
      cycle: "secondaire",
      level: "7e",
      category: "math",
      lang: "fr",
      price: 15,
      currency: "TND",
      billing_model: "one_time",
      mode: "replay",
      description: "Cours de révision + exercices corrigés.",
      status: "published",
      tags: ["math", "revision"],
    },
    {
      teacher_id: me.id,
      title: "Physique – Mécanique (Lycée) " + nowTag,
      cycle: "secondaire",
      level: "2e",
      category: "physique",
      lang: "fr",
      price: 20,
      currency: "TND",
      billing_model: "one_time",
      mode: "hybrid",
      description: "Cours hybride (live + replay) sur la mécanique.",
      status: "published",
      tags: ["physique", "mecanique"],
    },
    {
      teacher_id: me.id,
      title: "Anglais – Conversation (Université) " + nowTag,
      cycle: "université",
      level: "L1",
      category: "langues",
      lang: "fr",
      price: 30,
      currency: "TND",
      billing_model: "subscription",
      mode: "live",
      description: "Sessions live de conversation + supports.",
      status: "published",
      tags: ["anglais", "conversation"],
    },
  ];

  const { error } = await supabase.from("courses").insert(seeds);
  if (error) throw error;
  return true;
}
'@

# 2.2 Exam AI service (fix template literal bug)
Write-UTF8 (Join-Path $Root "src\lib\examAiService.ts") @'
export type ExamAiRequest = {
  subject: string;
  level: string;
  language?: "fr" | "ar" | "en";
  durationMinutes?: number;
  exerciseCount?: number;
  format?: "mix" | "qcm" | "problems" | "essay";
  chapter?: string;
  evaluationType?: "diagnostique" | "formative" | "sommative";
  objectives?: string[];
};

export async function generateExamWithAI(req: ExamAiRequest) {
  const base = (import.meta.env.VITE_AI_GATEWAY_URL as string) || "http://localhost:5188";
  const url = `${base}/v1/exams/generate`;

  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });

  if (!r.ok) {
    const t = await r.text().catch(() => "");
    throw new Error(`AI generate failed: ${r.status} ${t}`);
  }
  return await r.json();
}
'@

# 2.3 Certificate service (fix quotes bug)
Write-UTF8 (Join-Path $Root "src\lib\certificateService.ts") @'
import { jsPDF } from "jspdf";

export type CertificatePayload = {
  studentName: string;
  courseTitle: string;
  teacherName?: string;
  dateISO?: string;
};

export function buildCertificatePdf(p: CertificatePayload) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  const date = p.dateISO ? new Date(p.dateISO) : new Date();
  const dateStr = date.toLocaleDateString();

  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("CERTIFICAT", 105, 30, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.text("Ce certificat atteste que :", 20, 55);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(p.studentName || "—", 20, 70);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.text("a complété le cours :", 20, 85);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(p.courseTitle || "—", 20, 100);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(`Date : ${dateStr}`, 20, 120);

  if (p.teacherName) {
    doc.text(`Formateur : ${p.teacherName}`, 20, 130);
  }

  doc.setFontSize(10);
  doc.text("DONIA — Document généré automatiquement (validation humaine recommandée).", 20, 280);

  return doc;
}

export function downloadCertificatePdf(p: CertificatePayload) {
  const doc = buildCertificatePdf(p);
  const safeName = (p.studentName || "student").replace(/[^\w\-]+/g, "_");
  doc.save(`DONIA_Certificat_${safeName}.pdf`);
}
'@

# 2.4 Signaling client helper (socket.io)
Write-UTF8 (Join-Path $Root "src\lib\signalingClient.ts") @'
import { io, Socket } from "socket.io-client";

type SignalHandler = (payload: any) => void;

export function createSignalingClient(roomId: string, onSignal: SignalHandler) {
  const url = (import.meta.env.VITE_SIGNALING_URL as string) || "http://localhost:5179";
  const socket: Socket = io(url, { transports: ["websocket"] });

  socket.on("connect", () => {
    socket.emit("join", { roomId });
  });

  socket.on("signal", (payload) => onSignal(payload));

  return {
    socket,
    sendSignal(payload: any) {
      socket.emit("signal", { roomId, payload });
    },
    close() {
      socket.disconnect();
    },
  };
}
'@

# -------------------------------
# 3) Pages (UI)
# -------------------------------

# Courses page
Write-UTF8 (Join-Path $Root "src\pages\courses\index.tsx") @'
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
                {c.cycle} {c.level ? `• ${c.level}` : ""} {c.category ? `• ${c.category}` : ""}
              </div>
              <div style={{ marginTop: 6 }}>
                <span style={{ fontWeight: 700 }}>{c.price ?? 0}</span> {c.currency ?? "TND"} • {c.mode ?? "replay"} •{" "}
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
'@

# Teacher Dashboard page (seed + manage)
Write-UTF8 (Join-Path $Root "src\pages\teacher\index.tsx") @'
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
      <p style={{ opacity: 0.8 }}>Créer / publier des cours + seed rapide</p>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", margin: "12px 0" }}>
        <button
          onClick={async () => {
            setMsg(null);
            try {
              await seedCoursesForMe();
              setMsg("Seed OK ✅");
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
              setMsg("Cours créé ✅");
              await refresh();
            } catch (e: any) {
              setMsg(e?.message || String(e));
            }
          }}
          style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #ddd" }}
        >
          + Créer cours (draft)
        </button>

        <button
          onClick={() => refresh().catch((e) => setMsg(String(e?.message || e)))}
          style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #ddd" }}
        >
          Rafraîchir
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
                {c.cycle} {c.level ? `• ${c.level}` : ""} {c.category ? `• ${c.category}` : ""}
              </div>

              <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                {c.status !== "published" ? (
                  <button
                    onClick={async () => {
                      setMsg(null);
                      try {
                        await publishCourse(c.id);
                        setMsg("Publié ✅");
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
'@

# Exam generator page
Write-UTF8 (Join-Path $Root "src\pages\exams\index.tsx") @'
import React, { useState } from "react";
import { generateExamWithAI } from "../../lib/examAiService";

export default function ExamGeneratorPage() {
  const [subject, setSubject] = useState("Mathématiques");
  const [level, setLevel] = useState("7e");
  const [chapter, setChapter] = useState("Fractions");
  const [minutes, setMinutes] = useState(60);
  const [n, setN] = useState(4);
  const [loading, setLoading] = useState(false);
  const [out, setOut] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);

  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ fontSize: 22, fontWeight: 700 }}>Exam Generator IA</h2>
      <p style={{ opacity: 0.8 }}>Utilise VITE_AI_GATEWAY_URL (ex: http://localhost:5188)</p>

      <div style={{ display: "grid", gap: 10, maxWidth: 520 }}>
        <label>
          Matière
          <input value={subject} onChange={(e) => setSubject(e.target.value)} style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #ddd" }} />
        </label>
        <label>
          Niveau
          <input value={level} onChange={(e) => setLevel(e.target.value)} style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #ddd" }} />
        </label>
        <label>
          Chapitre / Notion
          <input value={chapter} onChange={(e) => setChapter(e.target.value)} style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #ddd" }} />
        </label>
        <label>
          Durée (minutes)
          <input type="number" value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #ddd" }} />
        </label>
        <label>
          Nombre d'exercices
          <input type="number" value={n} onChange={(e) => setN(Number(e.target.value))} style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #ddd" }} />
        </label>

        <button
          onClick={async () => {
            setErr(null);
            setOut(null);
            setLoading(true);
            try {
              const res = await generateExamWithAI({
                subject,
                level,
                chapter,
                durationMinutes: minutes,
                exerciseCount: n,
                language: "fr",
                format: "mix",
                evaluationType: "sommative",
              });
              setOut(res);
            } catch (e: any) {
              setErr(e?.message || String(e));
            } finally {
              setLoading(false);
            }
          }}
          style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #ddd" }}
        >
          {loading ? "Génération..." : "Générer"}
        </button>

        {err ? <div style={{ color: "#b91c1c" }}>{err}</div> : null}
      </div>

      {out ? (
        <div style={{ marginTop: 16 }}>
          <h3>Résultat</h3>
          <pre style={{ whiteSpace: "pre-wrap", background: "#0b1020", color: "#e5e7eb", padding: 12, borderRadius: 10 }}>
            {JSON.stringify(out, null, 2)}
          </pre>
        </div>
      ) : null}
    </div>
  );
}
'@

# Certificates page
Write-UTF8 (Join-Path $Root "src\pages\certificates\index.tsx") @'
import React, { useState } from "react";
import { downloadCertificatePdf } from "../../lib/certificateService";

export default function CertificatesPage() {
  const [studentName, setStudentName] = useState("Student Name");
  const [courseTitle, setCourseTitle] = useState("Course Title");
  const [teacherName, setTeacherName] = useState("DONIA");

  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ fontSize: 22, fontWeight: 700 }}>Certificats PDF</h2>
      <p style={{ opacity: 0.8 }}>Génération locale via jsPDF</p>

      <div style={{ display: "grid", gap: 10, maxWidth: 520 }}>
        <label>
          Nom étudiant
          <input value={studentName} onChange={(e) => setStudentName(e.target.value)} style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #ddd" }} />
        </label>
        <label>
          Titre du cours
          <input value={courseTitle} onChange={(e) => setCourseTitle(e.target.value)} style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #ddd" }} />
        </label>
        <label>
          Formateur
          <input value={teacherName} onChange={(e) => setTeacherName(e.target.value)} style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #ddd" }} />
        </label>

        <button
          onClick={() => downloadCertificatePdf({ studentName, courseTitle, teacherName })}
          style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #ddd" }}
        >
          Télécharger PDF
        </button>
      </div>
    </div>
  );
}
'@

# Live WebRTC MVP page
Write-UTF8 (Join-Path $Root "src\pages\live\index.tsx") @'
import React, { useEffect, useRef, useState } from "react";
import { createSignalingClient } from "../../lib/signalingClient";

const rtcConfig: RTCConfiguration = {
  iceServers: [{ urls: ["stun:stun.l.google.com:19302"] }],
};

export default function LiveClassesPage() {
  const [roomId, setRoomId] = useState("class-1");
  const [status, setStatus] = useState<string>("idle");
  const [joined, setJoined] = useState(false);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const sigRef = useRef<ReturnType<typeof createSignalingClient> | null>(null);
  const localVideo = useRef<HTMLVideoElement | null>(null);
  const remoteVideo = useRef<HTMLVideoElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  async function ensurePC() {
    if (pcRef.current) return pcRef.current;
    const pc = new RTCPeerConnection(rtcConfig);
    pcRef.current = pc;

    pc.onicecandidate = (ev) => {
      if (ev.candidate) {
        sigRef.current?.sendSignal({ kind: "ice", candidate: ev.candidate });
      }
    };

    pc.ontrack = (ev) => {
      const [stream] = ev.streams;
      if (remoteVideo.current && stream) remoteVideo.current.srcObject = stream;
    };

    return pc;
  }

  async function startMedia() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
    localStreamRef.current = stream;
    if (localVideo.current) localVideo.current.srcObject = stream;

    const pc = await ensurePC();
    stream.getTracks().forEach((t) => pc.addTrack(t, stream));
  }

  async function join() {
    if (joined) return;
    setStatus("joining...");
    await startMedia();
    sigRef.current = createSignalingClient(roomId, async (msg) => {
      const payload = msg?.payload ?? msg;
      const pc = await ensurePC();

      if (payload?.kind === "offer") {
        await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        sigRef.current?.sendSignal({ kind: "answer", sdp: pc.localDescription });
      } else if (payload?.kind === "answer") {
        await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
      } else if (payload?.kind === "ice" && payload.candidate) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
        } catch {
          // ignore
        }
      }
    });

    setJoined(true);
    setStatus("joined");
  }

  async function call() {
    setStatus("calling...");
    const pc = await ensurePC();
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    sigRef.current?.sendSignal({ kind: "offer", sdp: pc.localDescription });
    setStatus("offer-sent");
  }

  function hangup() {
    setStatus("hangup");
    try { sigRef.current?.close(); } catch {}
    sigRef.current = null;

    try { pcRef.current?.close(); } catch {}
    pcRef.current = null;

    const ls = localStreamRef.current;
    if (ls) ls.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;

    if (localVideo.current) localVideo.current.srcObject = null;
    if (remoteVideo.current) remoteVideo.current.srcObject = null;

    setJoined(false);
    setStatus("idle");
  }

  useEffect(() => {
    return () => hangup();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ fontSize: 22, fontWeight: 700 }}>Live classes (WebRTC MVP)</h2>
      <p style={{ opacity: 0.8 }}>
        Signaling: VITE_SIGNALING_URL (Socket.IO) • Events: <code>join</code> / <code>signal</code>
      </p>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginTop: 10 }}>
        <input
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
          style={{ padding: 10, borderRadius: 8, border: "1px solid #ddd", minWidth: 220 }}
        />
        <button onClick={join} disabled={joined} style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #ddd" }}>
          Join
        </button>
        <button onClick={call} disabled={!joined} style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #ddd" }}>
          Call (offer)
        </button>
        <button onClick={hangup} style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #ddd" }}>
          Hangup
        </button>
        <span style={{ opacity: 0.75 }}>Status: {status}</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 16 }}>
        <div style={{ border: "1px solid #e5e5e5", borderRadius: 12, padding: 10 }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Local</div>
          <video ref={localVideo} autoPlay playsInline muted style={{ width: "100%", borderRadius: 10, background: "#111827" }} />
        </div>
        <div style={{ border: "1px solid #e5e5e5", borderRadius: 12, padding: 10 }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Remote</div>
          <video ref={remoteVideo} autoPlay playsInline style={{ width: "100%", borderRadius: 10, background: "#111827" }} />
        </div>
      </div>

      <div style={{ marginTop: 12, fontSize: 12, opacity: 0.8 }}>
        Astuce: ouvre 2 onglets (ou 2 navigateurs), même roomId. Dans un onglet: Join → Call. Dans l'autre: Join (répond automatiquement).
      </div>
    </div>
  );
}
'@

# -------------------------------
# 4) Patch router.tsx (dedupe TeacherDashboard + add routes)
# -------------------------------
$routerPath = Join-Path $Root "src\router.tsx"
$router = Read-Text $routerPath
if(!$router){
  Warn "src/router.tsx not found. Skipping router patch."
} else {
  # 4.1 Dedupe "import TeacherDashboard ..."
  $lines = $router -split "`r?`n"
  $seenTeacherImport = $false
  $newLines = New-Object System.Collections.Generic.List[string]
  foreach($ln in $lines){
    if($ln -match '^\s*import\s+TeacherDashboard\s+from\s+'){
      if(!$seenTeacherImport){
        $seenTeacherImport = $true
        $newLines.Add($ln)
      } else {
        # drop duplicate
      }
    } else {
      $newLines.Add($ln)
    }
  }
  $router2 = ($newLines -join "`r`n")

  # 4.2 Ensure imports exist
  if($router2 -notmatch "from '\./pages/teacher'"){
    $router2 = $router2 -replace "(?m)^(import\s+.+;?\s*)$", "`$1`r`nimport TeacherDashboard from './pages/teacher';"
  }
  if($router2 -notmatch "from '\./pages/exams'"){
    $router2 = $router2 -replace "(?m)^(import\s+.+;?\s*)$", "`$1`r`nimport ExamGenerator from './pages/exams';"
  }
  if($router2 -notmatch "from '\./pages/certificates'"){
    $router2 = $router2 -replace "(?m)^(import\s+.+;?\s*)$", "`$1`r`nimport Certificates from './pages/certificates';"
  }
  if($router2 -notmatch "from '\./pages/live'"){
    $router2 = $router2 -replace "(?m)^(import\s+.+;?\s*)$", "`$1`r`nimport LiveClasses from './pages/live';"
  }
  if($router2 -notmatch "from '\./pages/courses'"){
    $router2 = $router2 -replace "(?m)^(import\s+.+;?\s*)$", "`$1`r`nimport CoursesPage from './pages/courses';"
  }

  # 4.3 Add routes if missing (simple add near end of routes array)
  if($router2 -notmatch 'path:\s*"/teacher"'){
    $router2 = $router2 -replace "\]\s*\)\s*;","  ,{ path: '/teacher', element: <TeacherDashboard /> }`r`n  ,{ path: '/courses', element: <CoursesPage /> }`r`n  ,{ path: '/exams', element: <ExamGenerator /> }`r`n  ,{ path: '/certificates', element: <Certificates /> }`r`n  ,{ path: '/live', element: <LiveClasses /> }`r`n]) ;"
  }

  Write-UTF8 $routerPath $router2
}

# -------------------------------
# 5) Dependencies check hints
# -------------------------------
$pkgPath = Join-Path $Root "package.json"
$pkg = Read-Text $pkgPath
if($pkg){
  if($pkg -notmatch '"jspdf"'){
    Warn "Missing dependency: jspdf (needed for Certificates). Run: npm i jspdf"
  }
  if($pkg -notmatch '"socket.io-client"'){
    Warn "Missing dependency: socket.io-client (needed for Live WebRTC). Run: npm i socket.io-client"
  }
} else {
  Warn "package.json not found"
}

Write-UTF8 (Join-Path $Root "docs\ELEARN_NEXT_STEPS.md") @'
# DONIA — E-Learning Final Pack

## Env
Ensure in .env:
- VITE_SUPABASE_URL=...
- VITE_SUPABASE_PUBLISHABLE_KEY=...
- VITE_AI_GATEWAY_URL=http://localhost:5188
- VITE_SIGNALING_URL=http://localhost:5179

## Install deps (if warned)
npm i jspdf socket.io-client

## Run
npm run dev
Open:
- /teacher  (seed + manage)
- /courses  (catalog)
- /exams    (AI)
- /certificates (PDF)
- /live     (WebRTC MVP)
'@

Ok "DONE ✅ E-learning final pack generated"
Write-Host "NEXT (fast): if warned above, run: npm i jspdf socket.io-client" -ForegroundColor Yellow
Write-Host "Then: npm run dev" -ForegroundColor Yellow
