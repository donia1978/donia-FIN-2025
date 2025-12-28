# DONIA_FIX_TUNISIA_FEEDS_1SHOT.ps1 (PowerShell 5.1)
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Ok($m){ Write-Host "[OK]  $m" -ForegroundColor Green }
function Info($m){ Write-Host "[INFO] $m" -ForegroundColor Cyan }

$Root = "C:\lovable\doniasocial"
$Server = Join-Path $Root "services\info-proxy\src\server.js"

if(!(Test-Path $Server)){
  throw "server.js not found: $Server"
}

$code = Get-Content $Server -Raw

# Replace feeds config safely
$replacement = @"
const FEEDS = {
  politics: [
    { name: "TAP", url: "https://www.tap.info.tn/fr/rss" },
    { name: "Kapitalis", url: "https://kapitalis.com/tunisie/feed/" },
    { name: "Business News", url: "https://www.businessnews.com.tn/rss.xml" }
  ],
  culture: [
    { name: "Webdo", url: "https://www.webdo.tn/fr/feed/" },
    { name: "Leaders", url: "https://leaders.com.tn/rss" },
    { name: "TAP Culture", url: "https://www.tap.info.tn/fr/rss" }
  ],
  sport: [
    { name: "Mosaique FM Sport", url: "https://www.mosaiquefm.net/fr/rss/sport/" },
    { name: "Sport Express", url: "https://www.sport-express.tn/rss" },
    { name: "Foot24", url: "https://www.foot24.tn/feed/" }
  ]
};
"@

# Replace FEEDS block
$code = [regex]::Replace(
  $code,
  "const FEEDS\s*=\s*\{[\s\S]*?\};",
  $replacement
)

Set-Content -Path $Server -Value $code -Encoding UTF8
Ok "Tunisia RSS feeds updated (removed broken sources)."

Info "Restart info-proxy to apply changes."
