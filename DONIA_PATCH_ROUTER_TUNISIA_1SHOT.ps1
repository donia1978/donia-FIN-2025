# DONIA_PATCH_ROUTER_TUNISIA_1SHOT.ps1 (PowerShell 5.1)
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function I($m){ Write-Host "[INFO] $m" -ForegroundColor Cyan }
function O($m){ Write-Host "[OK]  $m" -ForegroundColor Green }
function W($m){ Write-Host "[WARN] $m" -ForegroundColor Yellow }
function E($m){ Write-Host "[ERR] $m" -ForegroundColor Red; throw $m }

function ReadUtf8($p){
  if(!(Test-Path $p)){ return $null }
  return [IO.File]::ReadAllText($p,[Text.Encoding]::UTF8)
}
function WriteUtf8NoBom($p,$c){
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

$routerPath = Join-Path $Root "src\router.tsx"
if(!(Test-Path $routerPath)){ E "router.tsx not found: $routerPath" }

$r = ReadUtf8 $routerPath
if(!$r){ E "router.tsx is empty" }

if($r -match "/info/tunisia"){
  O "Route already present: /info/tunisia"
  Start-Process "http://localhost:8080/info/tunisia" | Out-Null
  exit 0
}

Backup $routerPath

# 1) Ensure import exists
$importLine = "import TunisiaInfoPage from './pages/info/tunisia';"

if($r -notmatch "TunisiaInfoPage"){
  # Insert after last import ...; line
  if($r -match "(?ms)^(?:import[^\r\n]*\r?\n)+"){
    $importsBlock = $Matches[0]
    if($importsBlock -notmatch [regex]::Escape($importLine)){
      $r = $r -replace [regex]::Escape($importsBlock), ($importsBlock + $importLine + "`r`n")
      O "Added import TunisiaInfoPage"
    }
  } else {
    # No imports block found, prepend
    $r = $importLine + "`r`n" + $r
    O "Prepended import TunisiaInfoPage"
  }
} else {
  O "Import symbol TunisiaInfoPage already referenced"
}

# 2) Insert route depending on router style
$routeObj = "  { path: '/info/tunisia', element: <TunisiaInfoPage /> },`r`n"
$routeJsx = "        <Route path=""/info/tunisia"" element={<TunisiaInfoPage />} />`r`n"

$patched = $false

# Case A: createBrowserRouter([...]) / createHashRouter([...])
if(($r -match "createBrowserRouter\s*\(") -or ($r -match "createHashRouter\s*\(")){
  # Try to inject before final "])" or "]);"
  if($r -match "(?ms)\]\s*\)\s*;"){
    $r = [regex]::Replace($r, "(?ms)\]\s*\)\s*;", ($routeObj + "]) ;"), 1)
    $patched = $true
    O "Patched route into create*Router([...]) block"
  } elseif($r -match "(?ms)\]\s*\)\s*$"){
    $r = [regex]::Replace($r, "(?ms)\]\s*\)\s*$", ($routeObj + "])"), 1)
    $patched = $true
    O "Patched route into create*Router([...]) block (EOF)"
  } elseif($r -match "(?ms)createBrowserRouter\s*\(\s*\["){
    $r = [regex]::Replace($r, "(?ms)(createBrowserRouter\s*\(\s*\[)", "`$1`r`n$routeObj", 1)
    $patched = $true
    O "Injected route right after createBrowserRouter(["
  } elseif($r -match "(?ms)createHashRouter\s*\(\s*\["){
    $r = [regex]::Replace($r, "(?ms)(createHashRouter\s*\(\s*\[)", "`$1`r`n$routeObj", 1)
    $patched = $true
    O "Injected route right after createHashRouter(["
  }
}

# Case B: JSX <Routes> ... </Routes>
if(-not $patched){
  if($r -match "(?ms)<Routes[^>]*>"){
    # Insert just before </Routes>
    if($r -match "(?ms)</Routes>"){
      $r = [regex]::Replace($r, "(?ms)</Routes>", ($routeJsx + "      </Routes>"), 1)
      $patched = $true
      O "Patched route into <Routes> JSX"
    }
  }
}

if(-not $patched){
  W "Router structure not auto-detected. I will append a safe comment block for manual placement."
  $r = $r.TrimEnd() + "`r`n`r`n// DONIA_TUNISIA_ROUTE_TODO`r`n// Add this route where your routes are defined:`r`n// { path: '/info/tunisia', element: <TunisiaInfoPage /> },`r`n"
}

WriteUtf8NoBom $routerPath $r
O "router.tsx updated"

# Open pages
Start-Process "http://localhost:5178/health" | Out-Null
Start-Process "http://localhost:8080/info/tunisia" | Out-Null

O "DONE ✅ If still 404, your router may be in another file; search for 'createBrowserRouter' or '<Routes' in src/."
