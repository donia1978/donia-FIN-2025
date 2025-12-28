# DONIA_FIX_NOTIFICATIONS_UI_STEP3_1SHOT_V2.ps1
# PS 5.1 compatible - Fix Step 3 (notifications TS/UI) with safe backups
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

# ---- Find notifications service file (common paths) ----
$candidatesService = @(
  "$Root\src\lib\notificationsService.ts",
  "$Root\src\lib\notifications.ts",
  "$Root\src\services\notificationsService.ts",
  "$Root\src\services\notifications.ts"
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

  # Make level optional in union type if present
  if($txt -match "level\s*:\s*(`"info`"\s*\|\s*`"success`"\s*\|\s*`"warning`"\s*\|\s*`"danger`")"){
    $txt = [regex]::Replace(
      $txt,
      "level\s*:\s*(`"info`"\s*\|\s*`"success`"\s*\|\s*`"warning`"\s*\|\s*`"danger`")",
      "level?: `$1",
      1
    )
    $changed = $true
    Ok "Patched: level -> level? (union)"
  }

  # Make level optional if "level: string"
  if($txt -match "level\s*:\s*string" -and $txt -notmatch "level\s*\?\s*:\s*string"){
    $txt = [regex]::Replace($txt, "level\s*:\s*string", "level?: string", 1)
    $changed = $true
    Ok "Patched: level: string -> level?: string"
  }

  # Insert helper normalizeLevel if file uses .level and helper absent
  if($txt -match "\.level" -and $txt -notmatch "function\s+normalizeLevel\s*\("){
    $helper = @"
function normalizeLevel(level) {
  var v = (level || 'info').toString().toLowerCase();
  if (v === 'danger' || v === 'error' || v === 'critical') return 'danger';
  if (v === 'warning' || v === 'warn') return 'warning';
  if (v === 'success' || v === 'ok') return 'success';
  return 'info';
}

"@
    $m = [regex]::Match($txt, "^(?:import[^\r\n]*\r?\n)+", [System.Text.RegularExpressions.RegexOptions]::Multiline)
    if($m.Success){
      $txt = $txt.Substring(0, $m.Length) + $helper + $txt.Substring($m.Length)
      $changed = $true
      Ok "Inserted helper: normalizeLevel(level)"
    } else {
      # no imports block; prepend helper
      $txt = $helper + $txt
      $changed = $true
      Ok "Prepended helper: normalizeLevel(level)"
    }
  }

  if($changed){
    WriteTextUtf8NoBom $servicePath $txt
    Ok "Saved: $servicePath"
  } else {
    Warn "No change needed in service file."
  }
}

# ---- Find Notifications UI file (common paths) ----
$candidatesUI = @(
  "$Root\src\pages\notifications\index.tsx",
  "$Root\src\pages\notifications.tsx",
  "$Root\src\pages\notifications\NotificationsPage.tsx",
  "$Root\src\pages\notifications\page.tsx",
  "$Root\src\pages\NotificationsPage.tsx"
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

  # Insert "var lvl = (n.level || 'info');" inside ".map((n)=>{"
  if($ui -match "\.map\(\(\s*n\s*\)\s*=>\s*\{"){
    if($ui -notmatch "var\s+lvl\s*=\s*\(n\.level\s*\|\|\s*`"info`"\)"){
      $ui = [regex]::Replace(
        $ui,
        "(\.map\(\(\s*n\s*\)\s*=>\s*\{)",
        "`$1`r`n        var lvl = (n.level || `"info`");",
        1
      )
      $uiChanged = $true
      Ok "Inserted: var lvl = (n.level || 'info')"
    }

    # Replace "n.level" -> "lvl" after insertion (safe: word boundary)
    if($ui -match "\bn\.level\b"){
      $ui = [regex]::Replace($ui, "\bn\.level\b", "lvl")
      $uiChanged = $true
      Ok "Replaced n.level -> lvl (UI)"
    }
  } else {
    Warn "Could not find .map((n)=>{ ... }) block. Not modifying UI."
  }

  if($uiChanged){
    WriteTextUtf8NoBom $uiPath $ui
    Ok "Saved: $uiPath"
  } else {
    Warn "No change needed in UI file."
  }
}

Info "DONE ✅ Step 3 patch applied."
Info "Run:"
Write-Host "  cd `"$Root`"" -ForegroundColor Gray
Write-Host "  npm run dev" -ForegroundColor Gray
Write-Host "  Open: http://localhost:8080/notifications" -ForegroundColor Gray
