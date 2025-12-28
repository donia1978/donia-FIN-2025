# ==========================================
# DONIA | TURN + TN Presets + Exams UI patch
# PowerShell 5.1 compatible (safe writes)
# ==========================================

param([switch]$Force)

$ErrorActionPreference = "Stop"

function Info($m){ Write-Host "[INFO] $m" -ForegroundColor Cyan }
function Ok($m){ Write-Host "[OK]  $m" -ForegroundColor Green }
function Warn($m){ Write-Host "[WARN] $m" -ForegroundColor Yellow }
function Die($m){ Write-Host "[ERR] $m" -ForegroundColor Red; throw $m }

function Write-Utf8NoBom([string]$Path,[string]$Content){
  $dir = Split-Path -Parent $Path
  if($dir -and !(Test-Path $dir)){ New-Item -ItemType Directory -Force -Path $dir | Out-Null }
  $utf8 = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($Path, $Content, $utf8)
}

function Read-Text([string]$Path){
  if(!(Test-Path $Path)){ return $null }
  return [System.IO.File]::ReadAllText($Path)
}

function Backup-File([string]$Path){
  if(Test-Path $Path){
    $bak = "$Path.bak_$(Get-Date -Format yyyyMMdd_HHmmss)"
    Copy-Item $Path $bak -Force
    Ok "Backup: $bak"
  }
}

function Ensure-EnvLine([string]$EnvPath,[string]$Key,[string]$Value){
  $line = "$Key=$Value"
  $txt = Read-Text $EnvPath
  if([string]::IsNullOrWhiteSpace($txt)){ $txt = "" }
  if($txt -match "(?m)^\s*$([regex]::Escape($Key))\s*="){
    return $false
  }
  if($txt.Length -gt 0 -and -not $txt.EndsWith("`r`n")){ $txt += "`r`n" }
  $txt += $line + "`r`n"
  Write-Utf8NoBom $EnvPath $txt
  return $true
}

# -----------------------------
# Root & paths
# -----------------------------
$Root = (Get-Location).Path
if($Root -notlike "*\lovable\doniasocial*"){
  Warn "You are not in C:\lovable\doniasocial. Current: $Root"
}
$EnvPath = Join-Path $Root ".env"
$TurnCompose = Join-Path $Root "infra\turn\docker-compose.yml"
$PresetPath = Join-Path $Root "src\lib\tnExamPresets.ts"
$ExamsPage = Join-Path $Root "src\pages\exams\index.tsx"

Info "Root: $Root"

if(!(Test-Path $EnvPath)){ Warn ".env not found, creating: $EnvPath"; Write-Utf8NoBom $EnvPath "" }

if(!(Test-Path $ExamsPage)){
  Die "Exams page not found: $ExamsPage"
}

# -----------------------------
# 1) TURN docker-compose (dev)
# -----------------------------
Backup-File $TurnCompose

$turnYaml = @"
services:
  coturn:
    image: coturn/coturn:latest
    restart: unless-stopped
    network_mode: host
    command: >
      -n
      --log-file=stdout
      --min-port=49160 --max-port=49200
      --listening-port=3478
      --fingerprint
      --lt-cred-mech
      --user=donia:doniasocial
      --realm=localhost
      --no-multicast-peers
      --no-cli
"@

Write-Utf8NoBom $TurnCompose $turnYaml
Ok "Wrote TURN compose: $TurnCompose"

# -----------------------------
# 2) Add env vars (Vite)
# -----------------------------
Backup-File $EnvPath
$added = 0
if(Ensure-EnvLine $EnvPath "VITE_STUN_URLS" "stun:stun.l.google.com:19302"){ $added++ }
if(Ensure-EnvLine $EnvPath "VITE_TURN_URLS" "turn:localhost:3478?transport=udp"){ $added++ }
if(Ensure-EnvLine $EnvPath "VITE_TURN_USERNAME" "donia"){ $added++ }
if(Ensure-EnvLine $EnvPath "VITE_TURN_CREDENTIAL" "doniasocial"){ $added++ }
Ok "Env updated (+$added lines if missing)."

# -----------------------------
# 3) Tunisia exam presets file
# -----------------------------
Backup-File $PresetPath

$presetTs = @'
export type TNExamPreset = {
  id: string;
  label: string;
  cycle: "primaire" | "college" | "lycee";
  niveau: string;
  matiere: string;
  langue: "fr" | "ar";
  dureeMin: number;
  nbExercices: number;
  format: "mix" | "problèmes" | "qcm" | "rédaction";
  baremeTotal: number;
  competences: string[];
  structure: { titre: string; points: number; consigne: string }[];
};

export const TN_EXAM_PRESETS: TNExamPreset[] = [
  {
    id: "tn_primaire_math_6e",
    label: "Tunisie • Primaire • 6e • Math • 60 min",
    cycle: "primaire",
    niveau: "6e primaire",
    matiere: "Mathématiques",
    langue: "fr",
    dureeMin: 60,
    nbExercices: 4,
    format: "mix",
    baremeTotal: 20,
    competences: [
      "Calcul (entiers, décimaux, fractions)",
      "Résolution de problèmes",
      "Géométrie (angles, périmètre, aire)",
      "Organisation de données (tableaux, graphiques)"
    ],
    structure: [
      { titre: "Exercice 1 – Calculs", points: 5, consigne: "Effectuer des calculs posés et/ou mental." },
      { titre: "Exercice 2 – Problème", points: 6, consigne: "Résoudre un problème en justifiant les étapes." },
      { titre: "Exercice 3 – Géométrie", points: 5, consigne: "Tracer/mesurer et calculer périmètre/aire." },
      { titre: "Exercice 4 – Données", points: 4, consigne: "Lire un tableau/graphique et répondre." }
    ]
  },
  {
    id: "tn_college_math_9e",
    label: "Tunisie • Collège • 9e • Math • 90 min",
    cycle: "college",
    niveau: "9e (collège)",
    matiere: "Mathématiques",
    langue: "fr",
    dureeMin: 90,
    nbExercices: 4,
    format: "problèmes",
    baremeTotal: 20,
    competences: [
      "Algèbre (équations, expressions)",
      "Géométrie (selon chapitre: triangles, Thalès/Pythagore...)",
      "Fonctions / lecture graphique (selon progression)",
      "Raisonnement et justification"
    ],
    structure: [
      { titre: "Exercice 1 – Algèbre", points: 5, consigne: "Simplifier, factoriser, résoudre." },
      { titre: "Exercice 2 – Problème", points: 6, consigne: "Modéliser puis résoudre." },
      { titre: "Exercice 3 – Géométrie", points: 5, consigne: "Justifier les résultats, soigner la figure." },
      { titre: "Exercice 4 – Interprétation", points: 4, consigne: "Lire un graphique/situation et conclure." }
    ]
  },
  {
    id: "tn_primaire_arabe_5e",
    label: "تونس • ابتدائي • خامسة • العربية • 60 دقيقة",
    cycle: "primaire",
    niveau: "الخامسة ابتدائي",
    matiere: "اللغة العربية",
    langue: "ar",
    dureeMin: 60,
    nbExercices: 3,
    format: "mix",
    baremeTotal: 20,
    competences: [
      "فهم المقروء",
      "قواعد اللغة",
      "الإنتاج الكتابي"
    ],
    structure: [
      { titre: "التمرين 1 – فهم نص", points: 8, consigne: "الإجابة عن أسئلة الفهم مع التعليل." },
      { titre: "التمرين 2 – قواعد", points: 6, consigne: "تطبيق قواعد نحوية/صرفية حسب الدرس." },
      { titre: "التمرين 3 – إنتاج كتابي", points: 6, consigne: "كتابة فقرة منظمة باحترام المطلوب." }
    ]
  }
];
'@

Write-Utf8NoBom $PresetPath $presetTs
Ok "Wrote: $PresetPath"

# -----------------------------
# 4) Patch Exams page (dropdown + apply)
#    DOM-fill approach (safe w/ unknown state)
# -----------------------------
Backup-File $ExamsPage
$ex = Read-Text $ExamsPage

# Ensure import
$importPreset = 'import { TN_EXAM_PRESETS } from "../../lib/tnExamPresets";'
if($ex -notmatch [regex]::Escape($importPreset)){
  if($ex -match "(?m)^(import .+;\s*)+"){
    $ex = [regex]::Replace($ex, "(?m)^(import .+;\s*)+", { param($m) $m.Value + "`r`n$importPreset`r`n" }, 1)
  } else {
    $ex = "$importPreset`r`n" + $ex
  }
  Ok "Patched import TN_EXAM_PRESETS"
} else {
  Ok "Import TN_EXAM_PRESETS already present"
}

# Inject helper block only once
if($ex -notmatch "DONIA_TN_PRESETS_BLOCK"){
  $block = @'
/* DONIA_TN_PRESETS_BLOCK
   UI dropdown that applies Tunisia presets without assuming your internal state shape.
   It tries to fill common inputs by id/name and dispatches input/change events.
*/
function __doniaSetField(key: string, value: string) {
  const selectors = [
    `#${key}`,
    `[name="${key}"]`,
    `[data-field="${key}"]`,
  ];
  for (const sel of selectors) {
    const el = document.querySelector(sel) as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null;
    if (!el) continue;
    (el as any).value = value;
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  }
  return false;
}

function __doniaApplyPreset(presetId: string) {
  const p = TN_EXAM_PRESETS.find(x => x.id === presetId);
  if (!p) return;
  __doniaSetField("matiere", p.matiere);
  __doniaSetField("subject", p.matiere);
  __doniaSetField("niveau", p.niveau);
  __doniaSetField("level", p.niveau);
  __doniaSetField("langue", p.langue);
  __doniaSetField("language", p.langue);
  __doniaSetField("duree", String(p.dureeMin));
  __doniaSetField("duration", String(p.dureeMin));
  __doniaSetField("nbExercices", String(p.nbExercices));
  __doniaSetField("exercises", String(p.nbExercices));
  __doniaSetField("format", p.format);
  __doniaSetField("examFormat", p.format);
  __doniaSetField("competences", p.competences.join("\n"));
  __doniaSetField("objectifs", p.competences.join("\n"));
  __doniaSetField("notes", JSON.stringify(p, null, 2));
}
'@

  # insert near top after imports
  $ex = $ex -replace "(?m)^(import .+;\s*)+\s*", "`$0`r`n$block`r`n"
  Ok "Injected presets helper block"
}

# Add dropdown JSX once: place after a heading or at top of returned JSX
if($ex -notmatch "DONIA_TN_PRESETS_DROPDOWN"){
  $dropdown = @'
{/* DONIA_TN_PRESETS_DROPDOWN */}
<div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 12 }}>
  <label style={{ fontWeight: 600 }}>Presets Tunisie</label>
  <select
    defaultValue=""
    onChange={(e) => __doniaApplyPreset(e.target.value)}
    style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #ddd", minWidth: 280 }}
  >
    <option value="" disabled>Sélectionner un preset…</option>
    {TN_EXAM_PRESETS.map(p => (
      <option key={p.id} value={p.id}>{p.label}</option>
    ))}
  </select>
  <span style={{ opacity: 0.7, fontSize: 12 }}>
    Remplit automatiquement matière/niveau/langue/durée/format/compétences.
  </span>
</div>
'@

  # Try to inject right after first <div ...> inside return(
  if($ex -match "return\s*\(\s*<"){
    $ex = [regex]::Replace($ex, "return\s*\(\s*(<[^>]+>)", { param($m) "return (`r`n        " + $m.Groups[1].Value + "`r`n        " + $dropdown }, 1)
    Ok "Injected presets dropdown into JSX"
  } else {
    Warn "Could not confidently inject dropdown (no return(<... found). Add manually if needed."
  }
}

Write-Utf8NoBom $ExamsPage $ex
Ok "Patched: $ExamsPage"

# -----------------------------
# Final next commands
# -----------------------------
Write-Host ""
Write-Host "DONE ✅ TURN + TN presets + Exams UI patched" -ForegroundColor Cyan
Write-Host ""
Write-Host "NEXT (DEV):" -ForegroundColor Yellow
Write-Host "1) Start TURN (optional dev):" -ForegroundColor Yellow
Write-Host "   cd `"$Root\infra\turn`"; docker compose up -d" -ForegroundColor DarkGray
Write-Host "2) Run web:" -ForegroundColor Yellow
Write-Host "   cd `"$Root`"; npm run dev" -ForegroundColor DarkGray
Write-Host "3) Open exams page and select a preset." -ForegroundColor Yellow
