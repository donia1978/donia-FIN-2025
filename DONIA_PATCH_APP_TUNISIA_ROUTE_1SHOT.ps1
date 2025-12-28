# ================================
# DONIA | PATCH App.tsx (Tunisia)
# PowerShell 5.1 SAFE
# ================================

$Root = Get-Location
$AppPath = Join-Path $Root "src\App.tsx"

if (!(Test-Path $AppPath)) {
  Write-Host "[ERR] App.tsx not found: $AppPath" -ForegroundColor Red
  exit 1
}

# Backup
$bak = "$AppPath.bak_$(Get-Date -Format yyyyMMdd_HHmmss)"
Copy-Item $AppPath $bak -Force
Write-Host "[OK] Backup created: $bak" -ForegroundColor Green

$content = Get-Content $AppPath -Raw

# ------------------------------------------------
# 1) Ensure import exists
# ------------------------------------------------
$importLine = 'import TunisiaInfo from "./pages/info/tunisia";'

if ($content -notmatch [regex]::Escape($importLine)) {
  # Insert after last import
  $content = $content -replace `
    "(import\s+.+?;\s*)+", `
    "`$0`r`n$importLine`r`n"
  Write-Host "[OK] Added TunisiaInfo import" -ForegroundColor Green
} else {
  Write-Host "[OK] TunisiaInfo import already exists" -ForegroundColor DarkGray
}

# ------------------------------------------------
# 2) Ensure route exists inside <Routes>
# ------------------------------------------------
$routeLine = '<Route path="/info/tunisia" element={<TunisiaInfo />} />'

if ($content -notmatch '/info/tunisia') {
  $content = $content -replace `
    '(<Routes[^>]*>)', `
    "`$1`r`n        $routeLine"
  Write-Host "[OK] Added /info/tunisia route" -ForegroundColor Green
} else {
  Write-Host "[OK] /info/tunisia route already exists" -ForegroundColor DarkGray
}

# Write back
Set-Content -Path $AppPath -Value $content -Encoding UTF8

Write-Host ""
Write-Host "DONE ✅ App.tsx patched successfully" -ForegroundColor Cyan
Write-Host "Open: http://localhost:8080/info/tunisia" -ForegroundColor Yellow
