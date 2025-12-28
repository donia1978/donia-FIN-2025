# ================================
# DONIA CLEAN + PUSH TO GITHUB
# Root: C:\lovable\doniasocial
# ================================

Set-ExecutionPolicy -Scope Process Bypass -Force
$Root = "C:\lovable\doniasocial"

function Info($m){ Write-Host "[INFO] $m" -ForegroundColor Cyan }
function Ok($m){ Write-Host "[OK]  $m" -ForegroundColor Green }
function Warn($m){ Write-Host "[WARN] $m" -ForegroundColor Yellow }
function Die($m){ Write-Host "[ERR] $m" -ForegroundColor Red; exit 1 }

if (!(Test-Path $Root)) {
  Die "Project root not found: $Root"
}

Set-Location $Root
Info "Working directory: $Root"

# ----------------
# 1) CLEAN SAFE
# ----------------
$cleanTargets = @(
  "node_modules",
  "dist",
  ".vite",
  ".cache",
  "coverage",
  "out",
  ".next"
)

foreach ($t in $cleanTargets) {
  $p = Join-Path $Root $t
  if (Test-Path $p) {
    Info "Removing $t"
    Remove-Item -Recurse -Force -LiteralPath $p
  }
}
Ok "Project cleaned (safe clean)"

# ----------------
# 2) GIT CHECK
# ----------------
if (!(Test-Path ".git")) {
  Die "This directory is not a git repository"
}

Info "Git status:"
git status

# ----------------
# 3) ADD + COMMIT
# ----------------
Info "Adding all changes"
git add -A

$hasChanges = git diff --cached --name-only
if (-not $hasChanges) {
  Warn "No changes to commit"
} else {
  $msg = "chore: clean project + stabilize DONIA (frontend, social, edu, info)"
  Info "Creating commit"
  git commit -m $msg
  Ok "Commit created"
}

# ----------------
# 4) SET REMOTE
# ----------------
$remoteUrl = "https://github.com/donia1978/doniasocial.git"
Info "Setting origin remote to $remoteUrl"
git remote set-url origin $remoteUrl

# ----------------
# 5) PUSH
# ----------------
Info "Pushing to GitHub (branch: main)"
git push origin main

if ($LASTEXITCODE -ne 0) {
  Die "Git push failed"
}

Ok "🎉 DONIA CLEANED & PUSHED SUCCESSFULLY"
Write-Host "Repo: https://github.com/donia1978/doniasocial" -ForegroundColor Green
