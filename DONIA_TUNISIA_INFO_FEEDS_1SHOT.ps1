# DONIA_TUNISIA_INFO_FEEDS_1SHOT.ps1  (PowerShell 5.1)
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function I($m){ Write-Host "[INFO] $m" -ForegroundColor Cyan }
function O($m){ Write-Host "[OK]  $m" -ForegroundColor Green }
function W($m){ Write-Host "[WARN] $m" -ForegroundColor Yellow }
function E($m){ Write-Host "[ERR] $m" -ForegroundColor Red; throw $m }

function EnsDir($p){ if(!(Test-Path $p)){ New-Item -ItemType Directory -Force -Path $p | Out-Null } }
function ReadUtf8($p){ if(!(Test-Path $p)){ return $null }; [IO.File]::ReadAllText($p,[Text.Encoding]::UTF8) }
function WriteUtf8NoBom($p,$c){
  $d = Split-Path -Parent $p
  if($d -and !(Test-Path $d)){ New-Item -ItemType Directory -Force -Path $d | Out-Null }
  $enc = New-Object Text.UTF8Encoding($false)
  [IO.File]::WriteAllText($p,$c,$enc)
}
function Backup($p){
  if(Test-Path $p){
    $ts = Get-Date -Format "yyyyMMdd_HHmmss"
    Copy-Item -Force $p "$p.bak_$ts"
    O "Backup: $p.bak_$ts"
  }
}

$Root = "C:\lovable\doniasocial"
if(!(Test-Path $Root)){ E "Root not found: $Root" }
Set-Location $Root
I "Root: $Root"

# 1) Ensure env var
$envPath = Join-Path $Root ".env"
if(!(Test-Path $envPath)){ E ".env missing at $envPath (create it first)" }
$envTxt = ReadUtf8 $envPath
if($envTxt -notmatch "(?m)^\s*VITE_INFO_PROXY_URL="){
  $envTxt = $envTxt.TrimEnd() + "`r`nVITE_INFO_PROXY_URL=http://localhost:5178`r`n"
  Backup $envPath
  WriteUtf8NoBom $envPath $envTxt
  O "Added VITE_INFO_PROXY_URL to .env"
} else {
  O "VITE_INFO_PROXY_URL already present"
}

# 2) Create info-proxy service
$svcRoot = Join-Path $Root "services\info-proxy"
EnsDir $svcRoot
EnsDir (Join-Path $svcRoot "src")

$pkg = @"
{
  "name": "donia-info-proxy",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "node src/server.js"
  },
  "dependencies": {
    "cors": "^2.8.5",
    "express": "^4.19.2",
    "node-fetch": "^3.3.2",
    "xml2js": "^0.6.2"
  }
}
"@
WriteUtf8NoBom (Join-Path $svcRoot "package.json") $pkg
O "Created services/info-proxy/package.json"

$server = @"
import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import { parseStringPromise } from "xml2js";

const app = express();
app.use(cors());

const PORT = process.env.PORT || 5178;

const FEEDS = {
  politics: [
    { name: "Tunisie Numérique", url: "https://www.tunisienumerique.com/feed/" }
  ],
  sport: [
    { name: "Mosaique FM Sport", url: "https://www.mosaiquefm.net/fr/rss/sport/" }
  ],
  culture: [
    { name: "Mosaique FM Culture", url: "https://www.mosaiquefm.net/fr/rss/culture/" }
  ]
};

// Basic RSS/Atom to normalized JSON
async function loadFeed(feedUrl, sourceName) {
  const r = await fetch(feedUrl, { headers: { "User-Agent": "DONIA-Info-Proxy/1.0" } });
  if (!r.ok) throw new Error("Fetch failed: " + feedUrl + " (" + r.status + ")");
  const xml = await r.text();
  const json = await parseStringPromise(xml, { explicitArray: false, mergeAttrs: true });

  // RSS
  if (json?.rss?.channel?.item) {
    const items = Array.isArray(json.rss.channel.item) ? json.rss.channel.item : [json.rss.channel.item];
    return items.map(it => ({
      title: (it.title || "").toString().trim(),
      link: (it.link || "").toString().trim(),
      publishedAt: (it.pubDate || it.published || it.updated || "").toString().trim(),
      summary: (it.description || it["content:encoded"] || "").toString().replace(/<[^>]+>/g, "").trim(),
      source: sourceName
    })).filter(x => x.title && x.link);
  }

  // Atom
  if (json?.feed?.entry) {
    const items = Array.isArray(json.feed.entry) ? json.feed.entry : [json.feed.entry];
    return items.map(it => {
      const link = Array.isArray(it.link) ? (it.link.find(l => l.rel !== "self")?.href || it.link[0]?.href) : (it.link?.href || it.link);
      return ({
        title: (it.title?._ || it.title || "").toString().trim(),
        link: (link || "").toString().trim(),
        publishedAt: (it.updated || it.published || "").toString().trim(),
        summary: (it.summary?._ || it.summary || "").toString().replace(/<[^>]+>/g, "").trim(),
        source: sourceName
      });
    }).filter(x => x.title && x.link);
  }

  return [];
}

app.get("/health", (_req, res) => res.json({ ok: true, service: "donia-info-proxy" }));

app.get("/api/info", async (req, res) => {
  try {
    const category = (req.query.category || "politics").toString();
    const max = Math.min(parseInt((req.query.max || "20").toString(), 10) || 20, 50);
    const feeds = FEEDS[category] || FEEDS.politics;

    const all = [];
    for (const f of feeds) {
      try {
        const items = await loadFeed(f.url, f.name);
        for (const it of items) all.push(it);
      } catch (e) {
        all.push({ title: "[Feed error] " + f.name, link: f.url, publishedAt: "", summary: String(e.message || e), source: f.name });
      }
    }

    // Sort by date string best-effort
    all.sort((a,b) => (b.publishedAt || "").localeCompare(a.publishedAt || ""));
    res.json({ category, items: all.slice(0, max) });
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
});

app.listen(PORT, () => console.log("DONIA Info Proxy listening on http://localhost:" + PORT));
"@
WriteUtf8NoBom (Join-Path $svcRoot "src\server.js") $server
O "Created services/info-proxy/src/server.js"

# 3) Front page: /info/tunisia
EnsDir (Join-Path $Root "src\pages\info")

$page = @"
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
      .catch(e => alive && setErr(String(e?.message || e)))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [url]);

  return (
    <div style={{ padding: 16, maxWidth: 1100, margin: "0 auto" }}>
      <h1 style={{ fontSize: 24, fontWeight: 800 }}>Tunisie — Infos</h1>
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

      {loading && <div style={{ marginTop: 16 }}>Chargement…</div>}
      {err && <div style={{ marginTop: 16, color: "#ffb4b4" }}>Erreur: {err}</div>}

      <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
        {items.map((it, idx) => (
          <article key={idx} style={{
            padding: 14, borderRadius: 14,
            border: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(0,0,0,0.18)"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <strong style={{ fontSize: 16 }}>{it.title}</strong>
              <span style={{ opacity: 0.75 }}>{it.source}{it.publishedAt ? " • " + it.publishedAt : ""}</span>
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
"@
WriteUtf8NoBom (Join-Path $Root "src\pages\info\tunisia.tsx") $page
O "Created src/pages/info/tunisia.tsx"

# 4) Try to patch router.tsx best-effort to include /info/tunisia
$routerPath = Join-Path $Root "src\router.tsx"
if(Test-Path $routerPath){
  $r = ReadUtf8 $routerPath
  if($r -and ($r -notmatch "/info/tunisia")){
    Backup $routerPath

    # Add import if missing
    if($r -notmatch "TunisiaInfoPage"){
      $imp = "import TunisiaInfoPage from './pages/info/tunisia';"
      # insert after first import line
      $r = [regex]::Replace($r, "^(import[^\r\n]*\r?\n)", "`$1$imp`r`n", 1)
    }

    # Insert route into routes array if pattern found
    $routeLine = "  { path: '/info/tunisia', element: <TunisiaInfoPage /> },`r`n"
    if($r -match "\]\s*;"){
      $r = [regex]::Replace($r, "\]\s*;", $routeLine + "];", 1)
      O "Route inserted near end of routes array"
    } elseif($r -match "routes\s*:\s*\["){
      # fallback: append after routes: [
      $r = [regex]::Replace($r, "(routes\s*:\s*\[\s*)", "`$1`r`n$routeLine", 1)
      O "Route inserted after routes: ["
    } else {
      W "Router structure unknown: add route manually for /info/tunisia"
    }

    WriteUtf8NoBom $routerPath $r
    O "router.tsx patched for /info/tunisia (best-effort)"
  } else {
    O "router already has /info/tunisia (or file empty)"
  }
} else {
  W "src/router.tsx not found; add route manually for Tunisia page"
}

# 5) Install deps for proxy service
I "Installing proxy deps (services/info-proxy)..."
Push-Location $svcRoot
try {
  if(!(Test-Path "node_modules")){
    & npm install
    if($LASTEXITCODE -ne 0){ E "npm install failed in info-proxy" }
  }
  O "info-proxy deps OK"
} finally {
  Pop-Location
}

# 6) Start proxy + start web (new windows) + open URLs
I "Starting info-proxy + web dev servers..."
Start-Process -FilePath "powershell.exe" -ArgumentList @(
  "-NoExit","-ExecutionPolicy","Bypass","-Command","cd `"$svcRoot`"; npm run dev"
) | Out-Null

Start-Sleep -Seconds 1

Start-Process -FilePath "powershell.exe" -ArgumentList @(
  "-NoExit","-ExecutionPolicy","Bypass","-Command","cd `"$Root`"; npm run dev"
) | Out-Null

Start-Sleep -Seconds 2
Start-Process "http://localhost:5178/health" | Out-Null
Start-Process "http://localhost:8080/info/tunisia" | Out-Null

O "DONE ✅ Tunisia feeds ready on /info/tunisia"
