# DONIA_PACK_TN_INFO_CALL_EDU_1SHOT_V2.ps1  (PowerShell 5.1)
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Info($m){ Write-Host "[INFO] $m" -ForegroundColor Cyan }
function Ok($m){ Write-Host "[OK]  $m" -ForegroundColor Green }
function Warn($m){ Write-Host "[WARN] $m" -ForegroundColor Yellow }
function Die($m){ Write-Host "[ERR] $m" -ForegroundColor Red; throw $m }

function ReadText($p){
  if(Test-Path $p){ return [IO.File]::ReadAllText($p, [Text.Encoding]::UTF8) }
  return $null
}
function WriteText($p, $s){
  $dir = Split-Path $p -Parent
  if($dir -and !(Test-Path $dir)){ New-Item -ItemType Directory -Force -Path $dir | Out-Null }
  [IO.File]::WriteAllText($p, $s, [Text.Encoding]::UTF8)
}
function BackupFile($p){
  if(Test-Path $p){
    $bak = "$p.bak_" + (Get-Date -Format "yyyyMMdd_HHmmss")
    Copy-Item -Force $p $bak
    Ok "Backup: $bak"
  }
}
function EnsureLineInEnv($envPath, $line){
  $raw = ""
  if(Test-Path $envPath){ $raw = Get-Content $envPath -Raw }
  if($raw -notmatch [regex]::Escape($line)){
    Add-Content -Path $envPath -Value ("`r`n" + $line + "`r`n")
    Ok "Added to .env: $line"
  } else {
    Ok ".env already has: $line"
  }
}

# -------------------------
# 0) Root
# -------------------------
$Root = "C:\lovable\doniasocial"
if(!(Test-Path $Root)){ Die "Root not found: $Root" }
Set-Location $Root
Info "Root: $Root"

# -------------------------
# 1) Ensure env vars
# -------------------------
$envPath = Join-Path $Root ".env"
if(!(Test-Path $envPath)){ New-Item -ItemType File -Force -Path $envPath | Out-Null }
BackupFile $envPath
EnsureLineInEnv $envPath "VITE_INFO_PROXY_URL=http://localhost:5178"
EnsureLineInEnv $envPath "VITE_SIGNALING_URL=http://localhost:5179"
# optional:
# EnsureLineInEnv $envPath "VITE_AI_GATEWAY_URL=http://localhost:5188"

# -------------------------
# 2) Ensure info-proxy service (Tunisia RSS)
# -------------------------
$proxyDir = Join-Path $Root "services\info-proxy"
$proxyPkg = Join-Path $proxyDir "package.json"
$proxySrv = Join-Path $proxyDir "src\server.js"

if(!(Test-Path $proxyDir)){ New-Item -ItemType Directory -Force -Path $proxyDir | Out-Null }
if(!(Test-Path (Join-Path $proxyDir "src"))){ New-Item -ItemType Directory -Force -Path (Join-Path $proxyDir "src") | Out-Null }

if(!(Test-Path $proxyPkg)){
  WriteText $proxyPkg @"
{
  "name": "donia-info-proxy",
  "private": true,
  "type": "module",
  "scripts": { "dev": "node src/server.js" },
  "dependencies": {
    "cors": "^2.8.5",
    "express": "^4.19.2",
    "rss-parser": "^3.13.0"
  }
}
"@
  Ok "Created services/info-proxy/package.json"
}

WriteText $proxySrv @"
import express from "express";
import cors from "cors";
import Parser from "rss-parser";

const app = express();
app.use(cors());
const parser = new Parser({ timeout: 15000 });

const FEEDS = {
  tunisia: [
    { name: "Mosaique FM (FR)", url: "https://www.mosaiquefm.net/fr/rss" },
    { name: "Mosaique FM (AR)", url: "https://www.mosaiquefm.net/ar/rss" },
    { name: "Tunisie Numerique", url: "https://www.tunisienumerique.com/tunisie-actualite/rss/" }
  ],
  politics: [
    { name: "Mosaique FM (FR)", url: "https://www.mosaiquefm.net/fr/rss" },
    { name: "Tunisie Numerique", url: "https://www.tunisienumerique.com/tunisie-actualite/rss/" }
  ],
  sport: [
    { name: "Mosaique FM (FR)", url: "https://www.mosaiquefm.net/fr/rss" }
  ],
  culture: [
    { name: "Mosaique FM (FR)", url: "https://www.mosaiquefm.net/fr/rss" }
  ]
};

function pickMedia(item) {
  let imageUrl = null;
  let videoUrl = null;

  if (item.enclosure && item.enclosure.url) {
    const u = item.enclosure.url;
    if (u.match(/\\.(mp4|webm)(\\?.*)?$/i)) videoUrl = u;
    if (u.match(/\\.(jpg|jpeg|png|webp)(\\?.*)?$/i)) imageUrl = u;
  }

  const content = (item.content || item["content:encoded"] || item.summary || "");
  const imgMatch = content.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (!imageUrl && imgMatch) imageUrl = imgMatch[1];

  return { imageUrl, videoUrl };
}

async function readFeeds(list, maxPerFeed) {
  const out = [];
  for (const f of list) {
    try {
      const feed = await parser.parseURL(f.url);
      const items = (feed.items || []).slice(0, maxPerFeed);
      for (const it of items) {
        const { imageUrl, videoUrl } = pickMedia(it);
        out.push({
          title: it.title || "",
          url: it.link || "",
          summary: (it.contentSnippet || it.summary || "").slice(0, 300),
          publishedAt: it.isoDate || it.pubDate || null,
          source: f.name,
          attribution: { sourceName: f.name, sourceUrl: f.url, itemUrl: it.link || "" },
          imageUrl,
          videoUrl
        });
      }
    } catch (e) {}
  }

  out.sort((a,b) => (b.publishedAt || "").localeCompare(a.publishedAt || ""));
  return out;
}

app.get("/health", (req,res) => res.json({ ok: true }));

app.get("/api/info", async (req, res) => {
  const category = (req.query.category || "tunisia").toString();
  const max = Math.max(5, Math.min(50, parseInt((req.query.max || "25").toString(), 10) || 25));

  const feeds = FEEDS[category] || FEEDS.tunisia;
  const items = await readFeeds(feeds, Math.ceil(max / Math.max(1, feeds.length)));

  res.json({ category, count: Math.min(max, items.length), items: items.slice(0, max) });
});

const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 5178;
app.listen(port, () => console.log("info-proxy listening on http://localhost:" + port));
"@
Ok "Wrote services/info-proxy/src/server.js"

# -------------------------
# 3) Create Tunisia info pages WITHOUT PowerShell interpolation
# -------------------------
$infoPages = @(
  @{ p="src\pages\info\tunisia.tsx";  cat="tunisia";  title="Tunisie" },
  @{ p="src\pages\info\culture.tsx";  cat="culture";  title="Culture (Tunisie)" },
  @{ p="src\pages\info\sport.tsx";    cat="sport";    title="Sport (Tunisie)" },
  @{ p="src\pages\info\politics.tsx"; cat="politics"; title="Politique (Tunisie)" }
)

$templateInfo = @'
import React, { useEffect, useMemo, useState } from "react";

type Item = {
  title: string;
  url: string;
  summary?: string;
  publishedAt?: string | null;
  source?: string;
  imageUrl?: string | null;
  videoUrl?: string | null;
  attribution?: { sourceName?: string; sourceUrl?: string; itemUrl?: string };
};

function fmtDate(s?: string | null) {
  if (!s) return "";
  try { return new Date(s).toLocaleString(); } catch { return s; }
}

export default function Page() {
  const base = (import.meta as any).env.VITE_INFO_PROXY_URL || "http://localhost:5178";
  const category = "__CAT__";
  const url = useMemo(() => `${base}/api/info?category=${category}&max=25`, [base]);

  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetch(url)
      .then(r => r.json())
      .then(j => { if(alive){ setItems(j.items || []); setErr(null); } })
      .catch(e => { if(alive){ setErr(String(e)); } })
      .finally(() => { if(alive){ setLoading(false); } });
    return () => { alive = false; };
  }, [url]);

  return (
    <div style={{ padding: 16, maxWidth: 1100, margin: "0 auto" }}>
      <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 6 }}>__TITLE__</h1>
      <div style={{ opacity: 0.75, marginBottom: 14 }}>
        Flux agrégés (Tunisie) — avec attribution + liens sources.
      </div>

      {loading && <div>Chargement…</div>}
      {err && <div style={{ color: "crimson" }}>Erreur: {err}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))", gap: 12 }}>
        {items.map((it, idx) => (
          <div key={idx} style={{ border: "1px solid rgba(255,255,255,0.1)", borderRadius: 14, padding: 12 }}>
            <div style={{ fontWeight: 700, lineHeight: 1.2 }}>
              <a href={it.url} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}>{it.title}</a>
            </div>

            <div style={{ fontSize: 12, opacity: 0.7, marginTop: 6 }}>
              {it.source ? <span>{it.source}</span> : null}
              {it.publishedAt ? <span> • {fmtDate(it.publishedAt)}</span> : null}
            </div>

            {it.imageUrl ? (
              <div style={{ marginTop: 10 }}>
                <img src={it.imageUrl} alt="" style={{ width: "100%", borderRadius: 12, maxHeight: 220, objectFit: "cover" }} />
              </div>
            ) : null}

            {it.videoUrl ? (
              <div style={{ marginTop: 10 }}>
                <video src={it.videoUrl} controls style={{ width: "100%", borderRadius: 12, maxHeight: 260 }} />
                <div style={{ fontSize: 12, opacity: 0.7, marginTop: 6 }}>
                  Vidéo fournie par la source (lecture sur site si indisponible).
                </div>
              </div>
            ) : null}

            {it.summary ? <div style={{ marginTop: 10, opacity: 0.9 }}>{it.summary}</div> : null}

            <div style={{ marginTop: 10, fontSize: 12, opacity: 0.75 }}>
              <div><b>Attribution:</b> {it.attribution?.sourceName || it.source || "Source"} </div>
              {it.attribution?.sourceUrl ? (
                <div><a href={it.attribution.sourceUrl} target="_blank" rel="noreferrer">Flux</a></div>
              ) : null}
              <div><a href={it.url} target="_blank" rel="noreferrer">Ouvrir l’article</a></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
'@

foreach($x in $infoPages){
  $full = Join-Path $Root $x.p
  BackupFile $full
  $content = $templateInfo.Replace("__CAT__", $x.cat).Replace("__TITLE__", $x.title)
  WriteText $full $content
  Ok ("Wrote " + $x.p)
}

# -------------------------
# 4) WebRTC client + Call page
# -------------------------
$webrtcLib = Join-Path $Root "src\lib\webrtcClient.ts"
BackupFile $webrtcLib
WriteText $webrtcLib @"
import { io, Socket } from "socket.io-client";

export function createSocket() : Socket {
  const url = (import.meta as any).env.VITE_SIGNALING_URL || "http://localhost:5179";
  return io(url, { transports: ["websocket"], autoConnect: true });
}

export async function createPeer(mode: "audio" | "video") {
  const pc = new RTCPeerConnection({
    iceServers: [
      { urls: ["stun:stun.l.google.com:19302", "stun:global.stun.twilio.com:3478"] }
    ]
  });

  const stream = await navigator.mediaDevices.getUserMedia({
    audio: true,
    video: mode === "video"
  });

  stream.getTracks().forEach(t => pc.addTrack(t, stream));
  return { pc, stream };
}
"@
Ok "Wrote src/lib/webrtcClient.ts"

$callPage = Join-Path $Root "src\pages\social\call.tsx"
BackupFile $callPage
WriteText $callPage @"
import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPeer, createSocket } from "../../lib/webrtcClient";

function q(name: string) {
  const u = new URL(window.location.href);
  return u.searchParams.get(name);
}

export default function CallPage() {
  const room = q("room") || "class-1";
  const mode = ((q("mode") || "audio") as any) === "video" ? "video" : "audio";

  const [status, setStatus] = useState<string>("Initialisation…");
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);

  const socket = useMemo(() => createSocket(), []);

  useEffect(() => {
    let alive = true;

    async function start() {
      setStatus("Accès micro/caméra…");
      const { pc, stream } = await createPeer(mode);

      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      pc.ontrack = (ev) => {
        const [remote] = ev.streams;
        if (remoteVideoRef.current && remote) remoteVideoRef.current.srcObject = remote;
      };

      pc.onicecandidate = (ev) => {
        if (ev.candidate) socket.emit("signal", { room, data: { type: "ice", candidate: ev.candidate } });
      };

      socket.emit("join", { room });

      socket.on("signal", async (payload: any) => {
        if (!alive) return;
        const msg = payload?.data;
        if (!msg) return;

        if (msg.type === "offer") {
          await pc.setRemoteDescription(msg.sdp);
          const ans = await pc.createAnswer();
          await pc.setLocalDescription(ans);
          socket.emit("signal", { room, data: { type: "answer", sdp: ans } });
          setStatus("Réponse envoyée…");
        } else if (msg.type === "answer") {
          await pc.setRemoteDescription(msg.sdp);
          setStatus("Connecté ✅");
        } else if (msg.type === "ice" && msg.candidate) {
          try { await pc.addIceCandidate(msg.candidate); } catch {}
        }
      });

      setStatus("Création de l’offre…");
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit("signal", { room, data: { type: "offer", sdp: offer } });
      setStatus("Offre envoyée… en attente");
    }

    start().catch(e => setStatus("Erreur: " + String(e)));

    return () => {
      alive = false;
      try { socket.disconnect(); } catch {}
    };
  }, [mode, room, socket]);

  return (
    <div style={{ padding: 16, maxWidth: 1100, margin: "0 auto" }}>
      <h1 style={{ fontSize: 24, fontWeight: 800 }}>Appel {mode === "video" ? "vidéo" : "audio"}</h1>
      <div style={{ opacity: 0.8, marginBottom: 12 }}>
        Room: <b>{room}</b> • Statut: <b>{status}</b>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div style={{ border: "1px solid rgba(255,255,255,0.1)", borderRadius: 14, padding: 12 }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Local</div>
          <video ref={localVideoRef} autoPlay muted playsInline style={{ width: "100%", borderRadius: 12, background: "black", minHeight: 220 }} />
        </div>

        <div style={{ border: "1px solid rgba(255,255,255,0.1)", borderRadius: 14, padding: 12 }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Distant</div>
          <video ref={remoteVideoRef} autoPlay playsInline style={{ width: "100%", borderRadius: 12, background: "black", minHeight: 220 }} />
        </div>
      </div>

      <div style={{ marginTop: 12, fontSize: 12, opacity: 0.75 }}>
        Note: STUN public par défaut. TURN à ajouter plus tard.
      </div>
    </div>
  );
}
"@
Ok "Wrote src/pages/social/call.tsx"

# -------------------------
# 5) Education Tunisia generator + page
# -------------------------
$eduSvc = Join-Path $Root "src\lib\educationTnService.ts"
BackupFile $eduSvc
WriteText $eduSvc @"
export type GenKind = "exam" | "planification" | "lesson";
export type GenInput = {
  kind: GenKind;
  matiere: string;
  niveau: string;
  langue: "FR" | "AR" | "EN";
  chapitre?: string;
  dureeMinutes?: number;
  exercices?: number;
  objectifs?: string;
};

function fallbackMarkdown(i: GenInput): string {
  const title = i.kind === "exam" ? "Examen" : i.kind === "planification" ? "Planification" : "Fiche leçon";
  return \`# \${title} — Tunisie
- Matière : \${i.matiere}
- Niveau : \${i.niveau}
- Langue : \${i.langue}
- Chapitre/Notion : \${i.chapitre || "—"}
- Durée : \${i.dureeMinutes || 60} min

## Objectifs
\${i.objectifs || "- Consolider les acquis\\n- Évaluer les compétences ciblées\\n- Développer l’autonomie"}

## Consignes générales
- Lire attentivement.
- Soigner la présentation.
- Justifier les réponses.

## Compétences évaluées
- Compréhension / application
- Raisonnement / résolution
- Communication

## Barème
- Total: 20 points

## Traçabilité
- Programme: Tunisie (à préciser)
- Références: (PDF / docs Donia si disponibles)

> Fallback local. Configure VITE_AI_GATEWAY_URL pour génération IA.
\`;
}

export async function generateTnDoc(input: GenInput): Promise<{ markdown: string }> {
  const base = (import.meta as any).env.VITE_AI_GATEWAY_URL;

  if (!base) return { markdown: fallbackMarkdown(input) };

  const prompt =
\`Tu es DONIA (assistant pédagogique). Génère un document conforme au contexte tunisien.
Type: \${input.kind}
Matière: \${input.matiere}
Niveau: \${input.niveau}
Langue: \${input.langue}
Chapitre/Notion: \${input.chapitre || ""}
Durée: \${input.dureeMinutes || 60}
Nb exercices/séances: \${input.exercices || 3}
Objectifs: \${input.objectifs || ""}

Contraintes:
- Sortie en Markdown structurée
- Sections standardisées + Traçabilité
- Barème total cohérent (/20)
- Progression graduée
\`;

  const r = await fetch(\`\${base}/v1/education/generate\`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, input })
  });

  if (!r.ok) return { markdown: fallbackMarkdown(input) + "\\n\\n> AI Gateway error: " + r.status };

  const j = await r.json();
  return { markdown: j.markdown || fallbackMarkdown(input) };
}
"@
Ok "Wrote src/lib/educationTnService.ts"

$eduPage = Join-Path $Root "src\pages\education\tn.tsx"
BackupFile $eduPage
WriteText $eduPage @"
import React, { useMemo, useState } from "react";
import { generateTnDoc, GenKind } from "../../lib/educationTnService";

export default function EducationTnPage() {
  const [kind, setKind] = useState<GenKind>("exam");
  const [matiere, setMatiere] = useState("Mathématiques");
  const [niveau, setNiveau] = useState("6e année primaire");
  const [langue, setLangue] = useState<"FR"|"AR"|"EN">("FR");
  const [chapitre, setChapitre] = useState("Nombres et opérations");
  const [dureeMinutes, setDuree] = useState(60);
  const [exercices, setEx] = useState(3);
  const [objectifs, setObj] = useState("Évaluer les acquis et consolider les compétences du programme tunisien.");
  const [out, setOut] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const title = useMemo(() => (
    kind === "exam" ? "Générateur تونس — Examens" :
    kind === "planification" ? "Générateur تونس — Planification" :
    "Générateur تونس — Fiche leçon"
  ), [kind]);

  async function run() {
    setLoading(true);
    try {
      const res = await generateTnDoc({ kind, matiere, niveau, langue, chapitre, dureeMinutes, exercices, objectifs });
      setOut(res.markdown);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: 16, maxWidth: 1100, margin: "0 auto" }}>
      <h1 style={{ fontSize: 26, fontWeight: 900 }}>{title}</h1>
      <div style={{ opacity: 0.75, marginBottom: 14 }}>
        Sortie Markdown + Traçabilité. Utilise AI Gateway si configurée, sinon fallback local.
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 12 }}>
        <div style={{ border: "1px solid rgba(255,255,255,0.1)", borderRadius: 14, padding: 12 }}>
          <div style={{ fontWeight: 800, marginBottom: 10 }}>Paramètres</div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
            <button onClick={() => setKind("exam")}>Examen</button>
            <button onClick={() => setKind("planification")}>Planification</button>
            <button onClick={() => setKind("lesson")}>Fiche leçon</button>
          </div>

          <div style={{ display: "grid", gap: 8 }}>
            <label>Matière <input value={matiere} onChange={e=>setMatiere(e.target.value)} /></label>
            <label>Niveau <input value={niveau} onChange={e=>setNiveau(e.target.value)} /></label>
            <label>Langue
              <select value={langue} onChange={e=>setLangue(e.target.value as any)}>
                <option value="FR">FR</option>
                <option value="AR">AR</option>
                <option value="EN">EN</option>
              </select>
            </label>
            <label>Chapitre/Notion <input value={chapitre} onChange={e=>setChapitre(e.target.value)} /></label>
            <label>Durée (min) <input type="number" value={dureeMinutes} onChange={e=>setDuree(parseInt(e.target.value,10)||60)} /></label>
            <label>Nb exercices/séances <input type="number" value={exercices} onChange={e=>setEx(parseInt(e.target.value,10)||3)} /></label>
            <label>Objectifs
              <textarea value={objectifs} onChange={e=>setObj(e.target.value)} rows={4} />
            </label>

            <button onClick={run} disabled={loading}>
              {loading ? "Génération…" : "Générer"}
            </button>
          </div>
        </div>

        <div style={{ border: "1px solid rgba(255,255,255,0.1)", borderRadius: 14, padding: 12 }}>
          <div style={{ fontWeight: 800, marginBottom: 10 }}>Résultat (Markdown)</div>
          <textarea value={out} onChange={e=>setOut(e.target.value)} rows={24} style={{ width: "100%" }} />
        </div>
      </div>
    </div>
  );
}
"@
Ok "Wrote src/pages/education/tn.tsx"

# -------------------------
# 6) Patch src/App.tsx routes (Lovable uses <Routes>)
# -------------------------
$appPath = Join-Path $Root "src\App.tsx"
if(!(Test-Path $appPath)){ Die "src\App.tsx not found (expected Lovable Routes file)" }
BackupFile $appPath
$app = ReadText $appPath
if(-not $app){ Die "Failed to read src/App.tsx" }

$imports = @(
  'import TunisiaInfoPage from "./pages/info/tunisia";',
  'import CultureInfoPage from "./pages/info/culture";',
  'import SportInfoPage from "./pages/info/sport";',
  'import PoliticsInfoPage from "./pages/info/politics";',
  'import CallPage from "./pages/social/call";',
  'import EducationTnPage from "./pages/education/tn";'
)

foreach($imp in $imports){
  if($app -notmatch [regex]::Escape($imp)){
    # insert after last import
    $app = [regex]::Replace($app, "(^import .*?;(\r?\n))+",
      { param($m) $m.Value + $imp + "`r`n" }, 1)
  }
}

$routeBlock = @"
{/* DONIA_TN_PACK_ROUTES */}
<Route path="/info/tunisia" element={<TunisiaInfoPage />} />
<Route path="/info/culture" element={<CultureInfoPage />} />
<Route path="/info/sport" element={<SportInfoPage />} />
<Route path="/info/politics" element={<PoliticsInfoPage />} />
<Route path="/social/call" element={<CallPage />} />
<Route path="/education/tn" element={<EducationTnPage />} />
"@

if($app -notmatch "/info/tunisia"){
  if($app -match "</Routes>"){
    $app = $app -replace "</Routes>", ($routeBlock + "`r`n</Routes>")
    Ok "Routes injected into App.tsx"
  } else {
    Warn "No </Routes> found in App.tsx. Add routes manually."
  }
} else {
  Ok "Routes already present in App.tsx"
}

WriteText $appPath $app
Ok "Patched src/App.tsx"

# -------------------------
# 7) Next steps doc
# -------------------------
WriteText (Join-Path $Root "docs\DONIA_TN_PACK_NEXT_STEPS.md") @"
# DONIA Tunisia Pack — Next steps

## 1) Start info-proxy
cd services\info-proxy
npm install
npm run dev
-> http://localhost:5178/health

## 2) Start Vite
cd C:\lovable\doniasocial
npm run dev
-> open:
  /info/tunisia
  /info/culture
  /info/sport
  /info/politics
  /education/tn
  /social/call?room=class-1&mode=audio

## WebRTC note
WebRTC UI requires a signaling server (Socket.IO) at VITE_SIGNALING_URL (join + signal).
"@
Ok "Wrote docs/DONIA_TN_PACK_NEXT_STEPS.md"

Ok "DONE ✅ V2 fixed (no PS interpolation)."
