# DONIA_TUNISIA_INFO_FEEDS_1SHOT_V2.ps1  (PowerShell 5.1)
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

# Ensure env key exists (do not break if already there)
$envPath = Join-Path $Root ".env"
if(!(Test-Path $envPath)){ E ".env missing at $envPath" }
$envTxt = ReadUtf8 $envPath
if($envTxt -notmatch "(?m)^\s*VITE_INFO_PROXY_URL="){
  Backup $envPath
  $envTxt = $envTxt.TrimEnd() + "`r`nVITE_INFO_PROXY_URL=http://localhost:5178`r`n"
  WriteUtf8NoBom $envPath $envTxt
  O "Added VITE_INFO_PROXY_URL to .env"
} else {
  O "VITE_INFO_PROXY_URL already present"
}

# Ensure proxy service exists
$svcRoot = Join-Path $Root "services\info-proxy"
if(!(Test-Path $svcRoot)){
  E "Missing services/info-proxy. Re-run the previous script once it finishes creating it, or create it manually."
}
O "services/info-proxy exists"

# Re-write Tunisia page with a *single-quoted* here-string to avoid $ expansion
EnsDir (Join-Path $Root "src\pages\info")
$pagePath = Join-Path $Root "src\pages\info\tunisia.tsx"
Backup $pagePath

$page = @'
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
                {it.source}{it.publishedAt ? " • " + it.publishedAt : ""}
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
'@

WriteUtf8NoBom $pagePath $page
O "Wrote src/pages/info/tunisia.tsx (safe, no PS var expansion)"

# Start proxy + web in new terminals
I "Starting info-proxy (http://localhost:5178) + web (http://localhost:8080)..."
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

O "DONE ✅ If /info/tunisia 404: add route in router.tsx manually."
