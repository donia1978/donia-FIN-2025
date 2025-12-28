# DONIA_START_LOCALHOST_TUNISIA_1SHOT.ps1 (PS 5.1)
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function I($m){ Write-Host "[INFO] $m" -ForegroundColor Cyan }
function O($m){ Write-Host "[OK]  $m" -ForegroundColor Green }
function W($m){ Write-Host "[WARN] $m" -ForegroundColor Yellow }
function E($m){ Write-Host "[ERR] $m" -ForegroundColor Red; throw $m }

$Root = "C:\lovable\doniasocial"
if(!(Test-Path $Root)){ E "Root not found: $Root" }
Set-Location $Root

# 0) Kill common stuck dev processes (best-effort)
I "Stopping old Node/Vite processes (best-effort)..."
Get-Process node -ErrorAction SilentlyContinue | ForEach-Object { try { $_.CloseMainWindow() | Out-Null } catch {} }
Start-Sleep -Milliseconds 300
Get-Process node -ErrorAction SilentlyContinue | ForEach-Object { try { Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue } catch {} }

# 1) Ensure deps installed (fast check)
if(!(Test-Path ".\node_modules")){
  I "node_modules not found => npm install"
  & npm install
  if($LASTEXITCODE -ne 0){ E "npm install failed" }
  O "Dependencies installed"
} else {
  O "Dependencies present"
}

# 2) Start info-proxy if exists
$proxyDir = Join-Path $Root "services\info-proxy"
if(Test-Path $proxyDir){
  I "Starting info-proxy on http://localhost:5178 ..."
  Start-Process -FilePath "cmd.exe" -ArgumentList "/c","cd /d `"$proxyDir`" && npm install && npm run dev" -WindowStyle Minimized | Out-Null
  Start-Sleep -Seconds 1
  O "info-proxy started (check http://localhost:5178/health)"
} else {
  W "services/info-proxy not found (skip)"
}

# 3) Start Vite (capture port from log)
$logDir = Join-Path $env:TEMP ("donia_vite_" + (Get-Date -Format "yyyyMMdd_HHmmss"))
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$viteLog = Join-Path $logDir "vite.log"

I "Starting Vite..."
$cmd = "cd /d `"$Root`" && npm run dev"
Start-Process -FilePath "cmd.exe" -ArgumentList "/c",$cmd,"1>`"$viteLog`" 2>&1" -WindowStyle Minimized | Out-Null

# 4) Wait for port in log (up to ~20s)
$port = $null
for($i=0; $i -lt 40; $i++){
  Start-Sleep -Milliseconds 500
  if(Test-Path $viteLog){
    $txt = Get-Content $viteLog -Raw -ErrorAction SilentlyContinue
    if($txt){
      # match: Local: http://localhost:8080/  OR  http://localhost:5173/
      $m = [regex]::Match($txt, "http://localhost:(\d+)")
      if($m.Success){
        $port = $m.Groups[1].Value
        break
      }
    }
  }
}

if(-not $port){
  W "Could not detect Vite port from log. Open vite log: $viteLog"
  W "Try manually: npm run dev (watch output for Local URL)"
  exit 0
}

O "Vite is running on port: $port"
$target = "http://localhost:$port/info/tunisia"
O "Opening: $target"
Start-Process $target | Out-Null

I "Vite log: $viteLog"
O "DONE ✅"
