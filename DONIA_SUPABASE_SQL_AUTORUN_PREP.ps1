param(
  [string]$SqlPath = "C:\lovable\doniasocial\docs\sql\supabase_rbac_core.sql",
  [string]$SupabaseUrl = "https://app.supabase.com"
)

$ErrorActionPreference = "Stop"
function Info($m){ Write-Host "[INFO] $m" -ForegroundColor Cyan }
function Ok($m){ Write-Host "[OK]  $m" -ForegroundColor Green }
function Die($m){ Write-Host "[ERR] $m" -ForegroundColor Red; throw $m }

# 1) Check SQL file
if(!(Test-Path -LiteralPath $SqlPath)){
  Die "SQL file not found: $SqlPath"
}

# 2) Read SQL
$sql = Get-Content -Raw -LiteralPath $SqlPath
if([string]::IsNullOrWhiteSpace($sql)){
  Die "SQL file is empty"
}

# 3) Copy to clipboard
Set-Clipboard -Value $sql
Ok "SQL copied to clipboard"

# 4) Open SQL file (read-only view)
Info "Opening SQL file for review"
Start-Process notepad.exe $SqlPath

# 5) Open Supabase Cloud
Info "Opening Supabase Cloud (login if needed)"
Start-Process $SupabaseUrl

Write-Host ""
Write-Host "==================== NEXT (30 seconds) ====================" -ForegroundColor Yellow
Write-Host "1) In Supabase: select your PROJECT" -ForegroundColor Yellow
Write-Host "2) Go to: SQL Editor → New query" -ForegroundColor Yellow
Write-Host "3) Press: CTRL + V (SQL already copied)" -ForegroundColor Yellow
Write-Host "4) Click: RUN" -ForegroundColor Yellow
Write-Host "===========================================================" -ForegroundColor Yellow
Write-Host ""
Ok "Supabase SQL auto-prep completed"
