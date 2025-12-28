 # DONIA_FIX_NOTIFICATIONS_UI_STEP3_1SHOT.ps1
# PowerShell 5.1 compatible (no ternary, no ??)
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Info($m){ Write-Host "[INFO] $m" -ForegroundColor Cyan }
function Ok($m){ Write-Host "[OK]  $m" -ForegroundColor Green }
function Warn($m){ Write-Host "[WARN] $m" -ForegroundColor Yellow }
function Die($m){ Write-Host "[ERR] $m" -ForegroundColor Red; throw $m }

function ReadText($p){
  if(!(Test-Path $p)){ return $null }
  return [System.IO.File]::ReadAllText($p, [System.Text.Encoding]::UTF8)
}
function WriteTextUtf8NoBom($p, $content){
  $dir = Split-Path -Parent $p
  if($dir -and !(Test-Path $dir)){ New-Item -ItemType Directory -Force -Path $dir | Out-Null }
  $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($p, $content, $utf8NoBom)
}
function BackupFile($p){
  if(!(Test-Path $p)){ return }
  $stamp = Get-Date -Format "yyyyMMdd_HHmmss"
  $bak = "$p.bak_$stamp"
  Copy-Item -Force $p $bak
  Ok "Backup: $bak"
}

# ---- Root ----
$Root = "C:\lovable\doniasocial"
if(!(Test-Path $Root)){ Die "Root not found: $Root" }
Set-Location $Root
Info "Root: $Root"

# ---- Find notifications service file (try common paths) ----
$candidatesService = @(
  Join-Path $Root "src\lib\notificationsService.ts",
  Join-Path $Root "src\lib\notifications.ts",
  Join-Path $Root "src\services\notificationsService.ts",
  Join-Path $Root "src\services\notifications.ts"
)

$servicePath = $null
foreach($c in $candidatesService){
  if(Test-Path $c){ $servicePath = $c; break }
}
if(-not $servicePath){
  Warn "No notifications service file found in common paths. Skipping service patch."
} else {
  Info "Service file: $servicePath"
  $txt = ReadText $servicePath
  if(-not $txt){ Die "Failed to read: $servicePath" }

  BackupFile $servicePath

  $changed = $false

  # 1) Make level optional in TS types:
  # replace "level: ..." -> "level?: ..."
  # but avoid replacing already optional
  if($txt -match "level\s*:\s*(`"info`"\s*\|\s*`"success`"\s*\|\s*`"warning`"\s*\|\s*`"danger`")"){
    $txt = [regex]::Replace(
      $txt,
      "level\s*:\s*(`"info`"\s*\|\s*`"success`"\s*\|\s*`"warning`"\s*\|\s*`"danger`")",
      "level?: `$1",
      1
    )
    $changed = $true
    Ok "Patched: level -> level? in union type"
  }

  # 2) If interface has "level: string" make optional
  if($txt -match "level\s*:\s*string" -and $txt -notmatch "level\s*\?\s*:\s*string"){
    $txt = [regex]::Replace($txt, "level\s*:\s*string", "level?: string", 1)
    $changed = $true
    Ok "Patched: level: string -> level?: string"
  }

  # 3) If code uses n.level directly in a mapping for badge/class,
  # add a helper normalize function if not present.
  if($txt -match "\.level" -and $txt -notmatch "function\s+normalizeLevel\s*\("){
    # insert helper near top (after imports)
    $helper = @"
function normalizeLevel(level) {
  var v = (level || 'info').toString().toLowerCase();
  if (v === 'danger' || v === 'error' || v === 'critical') return 'danger';
  if (v === 'warning' || v === 'warn') return 'warning';
  if (v === 'success' || v === 'ok') return 'success';
  return 'info';
}

"@
    # place after last import line
    $m = [regex]::Match($txt, "^(?:import[^\r\n]*\r?\n)+", [System.Text.RegularExpressions.RegexOptions]::Multiline)
    if($m.Success){
      $txt = $txt.Substring(0, $m.Length) + $helper + $txt.Substring($m.Length)
      $changed = $true
      Ok "Inserted helper: normalizeLevel(level)"
    }
  }

  if($changed){
    WriteTextUtf8NoBom $servicePath $txt
    Ok "Saved: $servicePath"
  } else {
    Warn "No change needed in service file."
  }
}

# ---- Try patch Notifications UI page (optional) ----
# We will add: const lvl = (n.level || "info");
# and replace direct usage in className/badge mapping if obvious.
$candidatesUI = @(
  Join-Path $Root "src\pages\notifications\index.tsx",
  Join-Path $Root "src\pages\notifications.tsx",
  Join-Path $Root "src\pages\notifications\NotificationsPage.tsx",
  Join-Path $Root "src\pages\notifications\page.tsx",
  Join-Path $Root "src\pages\NotificationsPage.tsx"
)

$uiPath = $null
foreach($c in $candidatesUI){
  if(Test-Path $c){ $uiPath = $c; break }
}

if(-not $uiPath){
  Warn "Notifications UI page not found (common paths). Skipping UI patch."
} else {
  Info "UI file: $uiPath"
  $ui = ReadText $uiPath
  if(-not $ui){ Die "Failed to read: $uiPath" }

  BackupFile $uiPath

  $uiChanged = $false

  # Add lvl fallback inside a map callback like notifications.map((n)=>{ ... })
  # Heuristic: find "notifications.map((n" or ".map((n"
  if($ui -match "\.map\(\(\s*n\s*\)\s*=>\s*\{"){
    if($ui -notmatch "var\s+lvl\s*=\s*\(n\.level\s*\|\|\s*`"info`"\)"){
      $ui = [regex]::Replace(
        $ui,
        "(\.map\(\(\s*n\s*\)\s*=>\s*\{)",
        "`$1`r`n        var lvl = (n.level || `"info`");",
        1
      )
      $uiChanged = $true
      Ok "Inserted: var lvl = (n.level || 'info') inside map callback"
    }
    # Replace occurrences of n.level in obvious UI contexts to use lvl
    if($ui -match "n\.level"){
      $ui = [regex]::Replace($ui, "\bn\.level\b", "lvl")
      $uiChanged = $true
      Ok "Replaced n.level -> lvl (UI file)"
    }
  } else {
    Warn "Could not find a .map((n)=>{ ... }) block. Not modifying UI."
  }

  if($uiChanged){
    WriteTextUtf8NoBom $uiPath $ui
    Ok "Saved: $uiPath"
  } else {
    Warn "No change needed in UI file."
  }
}

Info "DONE ✅ Step 3 patch applied."
Info "Next: run 'npm run dev' and open /notifications"
