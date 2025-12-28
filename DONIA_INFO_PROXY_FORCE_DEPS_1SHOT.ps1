# DONIA_INFO_PROXY_FORCE_DEPS_1SHOT.ps1 (PowerShell 5.1)
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Info($m){ Write-Host "[INFO] $m" -ForegroundColor Cyan }
function Ok($m){ Write-Host "[OK]  $m" -ForegroundColor Green }
function Warn($m){ Write-Host "[WARN] $m" -ForegroundColor Yellow }
function Die($m){ Write-Host "[ERR] $m" -ForegroundColor Red; throw $m }

$Root = "C:\lovable\doniasocial"
$Svc  = Join-Path $Root "services\info-proxy"
$Pkg  = Join-Path $Svc  "package.json"

if(!(Test-Path $Svc)){ Die "Not found: $Svc" }
if(!(Test-Path $Pkg)){ Die "Missing: $Pkg" }

Set-Location $Svc
Info "Working dir: $Svc"

# Load package.json
$pkgObj = Get-Content $Pkg -Raw | ConvertFrom-Json

if($null -eq $pkgObj.dependencies){
  $pkgObj | Add-Member -MemberType NoteProperty -Name dependencies -Value (@{})
}

# Ensure deps
$need = @{
  "rss-parser" = "^3.13.0"
  "express"    = "^4.19.2"
  "cors"       = "^2.8.5"
  "node-fetch" = "^3.3.2"
}
foreach($k in $need.Keys){
  if(-not $pkgObj.dependencies.PSObject.Properties.Name.Contains($k)){
    $pkgObj.dependencies | Add-Member -MemberType NoteProperty -Name $k -Value $need[$k]
  } else {
    # keep existing version
  }
}

# Ensure scripts.dev exists
if($null -eq $pkgObj.scripts){
  $pkgObj | Add-Member -MemberType NoteProperty -Name scripts -Value (@{})
}
if(-not $pkgObj.scripts.PSObject.Properties.Name.Contains("dev")){
  $pkgObj.scripts | Add-Member -MemberType NoteProperty -Name dev -Value "node src/server.js"
}

# Write back package.json (pretty)
$pkgJson = $pkgObj | ConvertTo-Json -Depth 20
Set-Content -Path $Pkg -Value $pkgJson -Encoding UTF8
Ok "Patched info-proxy package.json dependencies/scripts."

# Clean local install state (proxy only)
$nm = Join-Path $Svc "node_modules"
$lock1 = Join-Path $Svc "package-lock.json"
$lock2 = Join-Path $Svc "pnpm-lock.yaml"
$lock3 = Join-Path $Svc "yarn.lock"

if(Test-Path $nm){ Info "Removing node_modules..."; Remove-Item -Recurse -Force $nm }
if(Test-Path $lock1){ Remove-Item -Force $lock1 }
if(Test-Path $lock2){ Remove-Item -Force $lock2 }
if(Test-Path $lock3){ Remove-Item -Force $lock3 }
Ok "Cleaned local proxy install artifacts."

# npm network hardening
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

Info "Installing dependencies..."
& npm install
Ok "npm install done."

# Verify by requiring (works for CJS; rss-parser is CJS friendly)
Info "Verifying rss-parser..."
$verify = & node -e "try{require('rss-parser'); console.log('OK');}catch(e){console.error('FAIL'); process.exit(1)}" 2>&1
if($LASTEXITCODE -ne 0){ Die "Verify failed. Output: $verify" }
Ok "Verified: rss-parser import OK."

Info "Starting info-proxy (http://localhost:5178)..."
& npm run dev
