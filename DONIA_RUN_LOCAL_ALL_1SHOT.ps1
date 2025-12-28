# DONIA_RUN_LOCAL_ALL_1SHOT.ps1 (PowerShell 5.1)
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Info($m){ Write-Host "[INFO] $m" -ForegroundColor Cyan }
function Ok($m){ Write-Host "[OK]  $m" -ForegroundColor Green }
function Warn($m){ Write-Host "[WARN] $m" -ForegroundColor Yellow }
function Die($m){ Write-Host "[ERR] $m" -ForegroundColor Red; throw $m }

$Root = "C:\lovable\doniasocial"
if(!(Test-Path $Root)){ Die "Root not found: $Root" }

# -------------------------
# 1) Patch App.tsx route
# -------------------------
$AppPath = Join-Path $Root "src\App.tsx"
$TnPagePath = Join-Path $Root "src\pages\info\tunisia.tsx"

if(!(Test-Path $AppPath)){ Die "App.tsx not found: $AppPath" }
if(!(Test-Path $TnPagePath)){
  Warn "Missing Tunisia page: $TnPagePath"
  Warn "I'll still patch App.tsx route import; but create the page if needed."
}

$App = Get-Content $AppPath -Raw

# Detect if using react-router-dom <Routes>
if($App -notmatch "<Routes>"){ Warn "App.tsx does not contain <Routes>. Patch skipped (manual routing needed)." }
else {
  $needImport = ($App -notmatch "from\s+['""]\./pages/info/tunisia['""]") -and ($App -notmatch "TunisiaPage")
  $needRoute  = ($App -notmatch "path=\s*['""]/info/tunisia['""]")

  if($needImport){
    # Insert import near other imports (after last import line)
    $App = [regex]::Replace(
      $App,
      "(\r?\n)(?=(?:const|function|export|import\s*\{|\s*\/\/|\s*$))",
      "`r`nimport TunisiaInfoPage from './pages/info/tunisia';`r`n",
      1
    )
    # If previous regex failed to place well, fallback: prepend after first import line
    if($App -notmatch "import TunisiaInfoPage"){
      $App = [regex]::Replace($App, "^(import .+?\r?\n)", "`$1import TunisiaInfoPage from './pages/info/tunisia';`r`n", 1)
    }
  }

  if($needRoute){
    # Add <Route path="/info/tunisia" element={<TunisiaInfoPage />} />
    # Insert right after <Routes> line
    $App = [regex]::Replace(
      $App,
      "<Routes>\s*",
      "<Routes>`r`n          <Route path=""/info/tunisia"" element={<TunisiaInfoPage />} />`r`n",
      1
    )
  }

  Set-Content -Path $AppPath -Value $App -Encoding UTF8
  Ok "Patched App.tsx for /info/tunisia route (if missing)."
}

# -------------------------
# 2) Ensure info-proxy deps
# -------------------------
$Svc = Join-Path $Root "services\info-proxy"
if(!(Test-Path $Svc)){ Die "info-proxy not found: $Svc" }

Push-Location $Svc
try {
  if(!(Test-Path ".\package.json")){ Die "Missing package.json in info-proxy" }
  if(!(Test-Path ".\src\server.js")){ Die "Missing src/server.js in info-proxy" }

  $needInstall = $true
  if(Test-Path ".\node_modules\rss-parser"){ $needInstall = $false }

  if($needInstall){
    Info "Installing info-proxy dependencies..."
    try {
      npm config set fund false | Out-Null
      npm config set audit false | Out-Null
      npm config set fetch-retries 5 | Out-Null
      npm config set fetch-retry-maxtimeout 120000 | Out-Null
      npm config set fetch-retry-mintimeout 20000 | Out-Null
      npm config set maxsockets 20 | Out-Null
    } catch {
      Warn "npm config set warning (non-blocking): $($_.Exception.Message)"
    }
    & npm install
    Ok "info-proxy npm install done."
  } else {
    Ok "info-proxy deps already installed."
  }

  if(!(Test-Path ".\node_modules\rss-parser")){ Die "rss-parser still missing after install." }
  Ok "Verified: rss-parser installed."
}
finally {
  Pop-Location
}

# -------------------------
# 3) Launch both servers (two windows)
# -------------------------
$infoCmd = "cd /d `"$Svc`"; npm run dev"
$webCmd  = "cd /d `"$Root`"; npm run dev"

Info "Starting info-proxy (5178) in a new window..."
Start-Process -FilePath "powershell.exe" -ArgumentList @(
  "-NoExit","-ExecutionPolicy","Bypass","-Command",$infoCmd
) | Out-Null

Start-Sleep -Seconds 2

Info "Starting Vite (8080) in a new window..."
Start-Process -FilePath "powershell.exe" -ArgumentList @(
  "-NoExit","-ExecutionPolicy","Bypass","-Command",$webCmd
) | Out-Null

# -------------------------
# 4) Open browser targets
# -------------------------
Start-Sleep -Seconds 3

$u1 = "http://localhost:8080/info/tunisia"
$u2 = "http://localhost:8080/social/call?room=class-1&mode=audio"
$u3 = "http://localhost:8080/social/call?room=class-1&mode=video"

Info "Opening pages..."
Start-Process $u1 | Out-Null
Start-Process $u2 | Out-Null
Start-Process $u3 | Out-Null

Ok "DONE ✅  If you still see 404, paste me src\App.tsx (routing section) and I will patch it perfectly."
