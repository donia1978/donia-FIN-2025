# DONIA_AUTO_PATCH_TUNISIA_ROUTE_1SHOT.ps1 (PowerShell 5.1)
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
I "Root: $Root"

# sanity: ensure page exists
$pagePath = Join-Path $Root "src\pages\info\tunisia.tsx"
if(!(Test-Path $pagePath)){
  E "Missing page: $pagePath (run DONIA_TUNISIA_INFO_FEEDS_1SHOT_V2.ps1 first)"
}
O "Page exists: src/pages/info/tunisia.tsx"

# Find router candidates (React Router v6 patterns)
I "Scanning for router files..."
$files = Get-ChildItem -Path (Join-Path $Root "src") -Recurse -File -ErrorAction SilentlyContinue |
  Where-Object { $_.Extension -in ".ts",".tsx",".js",".jsx" }

if(!$files){ E "No src files found" }

$candidates = @()

foreach($f in $files){
  $t = ReadUtf8 $f.FullName
  if(!$t){ continue }

  $score = 0
  if($t -match "createBrowserRouter|createHashRouter|createMemoryRouter"){ $score += 6 }
  if($t -match "<Routes\b|<Route\b"){ $score += 5 }
  if($t -match "BrowserRouter|HashRouter"){ $score += 3 }
  if($t -match "react-router-dom"){ $score += 2 }
  if($t -match "path:\s*['""]/" ){ $score += 2 }
  if($t -match "element:\s*<" ){ $score += 2 }
  if($t -match "export\s+default\s+router|export\s+const\s+router"){ $score += 1 }

  if($score -ge 7){
    $candidates += [pscustomobject]@{ Path=$f.FullName; Score=$score }
  }
}

if(!$candidates){
  E "No router candidate found. Run: Get-ChildItem -Recurse src -File | Select-String 'Routes|createBrowserRouter' -List"
}

$candidates = $candidates | Sort-Object Score -Descending
$routerFile = $candidates[0].Path
I ("Router candidate => " + $routerFile + " (score=" + $candidates[0].Score + ")")

$r = ReadUtf8 $routerFile
if(!$r){ E "Router file empty: $routerFile" }

if($r -match "/info/tunisia"){
  O "Route already present in router file."
  Start-Process "http://localhost:8080/info/tunisia" | Out-Null
  exit 0
}

Backup $routerFile

# Ensure import exists
$importLine = "import TunisiaInfoPage from './pages/info/tunisia';"
$importAlt1 = "import TunisiaInfoPage from ""./pages/info/tunisia"";"
$importAlt2 = "import TunisiaInfoPage from ""../pages/info/tunisia"";"
$hasImport = ($r -match "TunisiaInfoPage") -or ($r -match [regex]::Escape($importLine)) -or ($r -match [regex]::Escape($importAlt1)) -or ($r -match [regex]::Escape($importAlt2))

if(-not $hasImport){
  # Pick relative import based on router location
  $routerDir = Split-Path -Parent $routerFile
  $srcDir = Join-Path $Root "src"
  $rel = $routerDir.Substring($srcDir.Length).TrimStart("\","/")  # relative path inside src
  # If router in src, use ./pages...
  # If router in src/something, use ../pages...
  $importToUse = $importLine
  if($rel -and $rel -notmatch "^[\\\/]?$"){
    $importToUse = "import TunisiaInfoPage from '../pages/info/tunisia';"
  }

  if($r -match "(?ms)^(?:import[^\r\n]*\r?\n)+"){
    $importsBlock = $Matches[0]
    if($importsBlock -notmatch [regex]::Escape($importToUse)){
      $r = $r -replace [regex]::Escape($importsBlock), ($importsBlock + $importToUse + "`r`n")
      O "Added import: $importToUse"
    }
  } else {
    $r = $importToUse + "`r`n" + $r
    O "Prepended import: $importToUse"
  }
} else {
  O "TunisiaInfoPage import already referenced"
}

# Add route depending on style
$routeObj = "  { path: '/info/tunisia', element: <TunisiaInfoPage /> },`r`n"
$routeJsx = "        <Route path=""/info/tunisia"" element={<TunisiaInfoPage />} />`r`n"
$patched = $false

# Style A: createBrowserRouter([...])
if(($r -match "createBrowserRouter\s*\(") -or ($r -match "createHashRouter\s*\(") -or ($r -match "createMemoryRouter\s*\(")){
  # Insert before array close inside create*Router([...])
  if($r -match "(?ms)create(Browser|Hash|Memory)Router\s*\(\s*\["){
    # insert right after the opening [
    $r = [regex]::Replace($r, "(?ms)(create(Browser|Hash|Memory)Router\s*\(\s*\[)", "`$1`r`n$routeObj", 1)
    $patched = $true
    O "Injected route into create*Router([ ... ])"
  }
}

# Style B: JSX <Routes>
if(-not $patched){
  if($r -match "(?ms)<Routes\b[^>]*>"){
    if($r -match "(?ms)</Routes>"){
      $r = [regex]::Replace($r, "(?ms)</Routes>", ($routeJsx + "      </Routes>"), 1)
      $patched = $true
      O "Injected route into <Routes>...</Routes>"
    }
  }
}

# Style C: route objects in an array "routes = [ ... ]"
if(-not $patched){
  if($r -match "(?ms)(routes\s*=\s*\[)"){
    $r = [regex]::Replace($r, "(?ms)(routes\s*=\s*\[)", "`$1`r`n$routeObj", 1)
    $patched = $true
    O "Injected route into routes = [ ... ]"
  }
}

if(-not $patched){
  W "Could not auto-place route. Appending a TODO comment for manual insert."
  $r = $r.TrimEnd() + "`r`n`r`n// DONIA_TUNISIA_ROUTE_TODO: add`r`n// { path: '/info/tunisia', element: <TunisiaInfoPage /> },`r`n"
}

WriteUtf8NoBom $routerFile $r
O "Router updated: $routerFile"

# Open
Start-Process "http://localhost:5178/health" | Out-Null
Start-Process "http://localhost:8080/info/tunisia" | Out-Null

O "DONE ✅"
