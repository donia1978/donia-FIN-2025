# DONIA_TN_FEEDS_AND_OBJECTIFS_1SHOT.ps1 (PS 5.1)
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function I($m){Write-Host "[INFO] $m" -ForegroundColor Cyan}
function O($m){Write-Host "[OK]  $m" -ForegroundColor Green}
function W($m){Write-Host "[WARN] $m" -ForegroundColor Yellow}
function E($m){Write-Host "[ERR] $m" -ForegroundColor Red; throw $m}

function EnsDir($p){ if(!(Test-Path $p)){ New-Item -ItemType Directory -Force -Path $p | Out-Null; O "DIR  + $p" } }
function ReadUtf8($p){ if(!(Test-Path $p)){ return $null }; return [IO.File]::ReadAllText($p,[Text.Encoding]::UTF8) }
function WriteUtf8NoBom($p,$c){
  $d = Split-Path -Parent $p
  if($d -and !(Test-Path $d)){ New-Item -ItemType Directory -Force -Path $d | Out-Null }
  $enc = New-Object Text.UTF8Encoding($false)
  [IO.File]::WriteAllText($p,$c,$enc)
  O "WRITE $p"
}
function Backup($p){
  if(Test-Path $p){
    $ts = Get-Date -Format "yyyyMMdd_HHmmss"
    $bak = "$p.bak_$ts"
    Copy-Item -Force $p $bak
    O "BAK  $bak"
  }
}

$Root = "C:\lovable\doniasocial"
if(!(Test-Path $Root)){ E "Root not found: $Root" }
Set-Location $Root
I "Root: $Root"

# ---- dirs
EnsDir "$Root\src\lib"
EnsDir "$Root\src\components"
EnsDir "$Root\src\pages\info"
EnsDir "$Root\docs"

# ---- Tunisian feeds registry (RSS + attribution)
$tnFeeds = @'
export type TnFeedCategory = "news" | "politics" | "sport" | "culture";
export type TnFeed = {
  id: string;
  title: string;
  url: string;          // RSS or HTML
  kind: "rss" | "html";
  category: TnFeedCategory;
  lang: "fr" | "ar" | "en";
  publisher: string;
  homepage: string;
  licenseHint: string;  // attribution/legal hint
};

export const TN_FEEDS: TnFeed[] = [
  {
    id: "mosaique_rss_fr",
    title: "Mosaique FM (RSS FR)",
    url: "https://www.mosaiquefm.net/FR/rss",
    kind: "rss",
    category: "news",
    lang: "fr",
    publisher: "Mosaique FM",
    homepage: "https://www.mosaiquefm.net/fr",
    licenseHint: "Afficher extrait + lien; crédit Mosaique FM; respecter droits/conditions du site."
  },
  {
    id: "tn_numerique_rss",
    title: "Tunisie Numérique (RSS)",
    url: "https://www.tunisienumerique.com/tunisie-actualite/rss/",
    kind: "rss",
    category: "news",
    lang: "fr",
    publisher: "Tunisie Numerique",
    homepage: "https://www.tunisienumerique.com",
    licenseHint: "Afficher extrait + lien; crédit Tunisie Numerique; respecter droits/conditions du site."
  },
  {
    id: "tap_portal_fr",
    title: "TAP (Portail FR - fallback HTML)",
    url: "https://www.tap.info.tn/fr",
    kind: "html",
    category: "news",
    lang: "fr",
    publisher: "Tunis Afrique Presse (TAP)",
    homepage: "https://www.tap.info.tn/fr",
    licenseHint: "Si RSS indisponible, afficher titres + lien uniquement; crédit TAP."
  }
];

// Simple mapping for tabs
export const TN_TABS: { key: TnFeedCategory; label: string }[] = [
  { key: "news", label: "Actualités" },
  { key: "politics", label: "Politique" },
  { key: "sport", label: "Sport" },
  { key: "culture", label: "Culture" }
];
'@
WriteUtf8NoBom "$Root\src\lib\tnFeeds.ts" $tnFeeds

# ---- RSS/HTML fetch helper (CORS-friendly fallback)
$rssClient = @'
import type { TnFeed } from "./tnFeeds";

export type FeedItem = {
  title: string;
  link: string;
  pubDate?: string;
  summary?: string;
  sourceTitle?: string;
  sourceHomepage?: string;
  licenseHint?: string;
};

function stripHtml(s: string): string {
  return (s || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function toAllOrigins(url: string): string {
  // Public CORS proxy fallback. You can replace with your own proxy later.
  return "https://api.allorigins.win/raw?url=" + encodeURIComponent(url);
}

async function fetchText(url: string): Promise<string> {
  const proxy = import.meta.env.VITE_NEWS_PROXY_URL as string | undefined;
  const target = proxy && proxy.length > 0 ? (proxy.replace(/\/+$/,"") + "/raw?url=" + encodeURIComponent(url)) : toAllOrigins(url);
  const res = await fetch(target, { method: "GET" });
  if (!res.ok) throw new Error("fetch failed: " + res.status);
  return await res.text();
}

function parseRss(xml: string): FeedItem[] {
  const doc = new DOMParser().parseFromString(xml, "text/xml");
  const items = Array.from(doc.querySelectorAll("item")).slice(0, 30);
  return items.map((it) => {
    const title = it.querySelector("title")?.textContent || "Sans titre";
    const link = it.querySelector("link")?.textContent || "";
    const pubDate = it.querySelector("pubDate")?.textContent || it.querySelector("date")?.textContent || undefined;
    const desc = it.querySelector("description")?.textContent || it.querySelector("content\\:encoded")?.textContent || "";
    return {
      title: stripHtml(title),
      link: stripHtml(link),
      pubDate: pubDate ? stripHtml(pubDate) : undefined,
      summary: desc ? stripHtml(desc).slice(0, 220) : undefined,
    };
  }).filter(x => x.link.length > 0);
}

function parseTapHtml(html: string): FeedItem[] {
  // Minimal heuristic: extract <a href="...">Title</a> within page; keep first 30
  const doc = new DOMParser().parseFromString(html, "text/html");
  const anchors = Array.from(doc.querySelectorAll("a"))
    .map(a => ({ href: a.getAttribute("href") || "", text: (a.textContent || "").trim() }))
    .filter(x => x.text.length >= 20 && x.href.length > 0)
    .slice(0, 40);

  const uniq: { [k: string]: boolean } = {};
  const items: FeedItem[] = [];
  for (const a of anchors) {
    const link = a.href.startsWith("http") ? a.href : ("https://www.tap.info.tn" + (a.href.startsWith("/") ? a.href : ("/" + a.href)));
    if (uniq[link]) continue;
    uniq[link] = true;
    items.push({ title: stripHtml(a.text), link });
    if (items.length >= 30) break;
  }
  return items;
}

export async function loadFeed(feed: TnFeed): Promise<FeedItem[]> {
  const raw = await fetchText(feed.url);
  const items = feed.kind === "rss" ? parseRss(raw) : parseTapHtml(raw);
  return items.map(it => ({
    ...it,
    sourceTitle: feed.publisher,
    sourceHomepage: feed.homepage,
    licenseHint: feed.licenseHint
  }));
}
'@
WriteUtf8NoBom "$Root\src\lib\tnInfoService.ts" $rssClient

# ---- UI component to show feed with attribution
$infoFeed = @'
import React from "react";
import type { FeedItem } from "../lib/tnInfoService";

function timeish(s?: string){
  if(!s) return "";
  return s.length > 40 ? s.slice(0,40) + "…" : s;
}

export default function InfoFeed(props: { title: string; items: FeedItem[]; loading?: boolean; error?: string }){
  const { title, items, loading, error } = props;
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{title}</h2>
      </div>

      {loading && <div className="text-sm opacity-70">Chargement…</div>}
      {error && <div className="text-sm text-red-500">{error}</div>}

      <div className="space-y-3">
        {items.slice(0, 20).map((it, idx) => (
          <div key={idx} className="rounded-xl border p-3 hover:bg-muted/30 transition">
            <a href={it.link} target="_blank" rel="noreferrer" className="font-medium underline-offset-2 hover:underline">
              {it.title}
            </a>
            <div className="text-xs opacity-70 mt-1 flex flex-wrap gap-2">
              {it.pubDate && <span>{timeish(it.pubDate)}</span>}
              {it.sourceTitle && it.sourceHomepage && (
                <a className="hover:underline" target="_blank" rel="noreferrer" href={it.sourceHomepage}>
                  Source: {it.sourceTitle}
                </a>
              )}
            </div>
            {it.summary && <div className="text-sm opacity-80 mt-2">{it.summary}</div>}
            {it.licenseHint && <div className="text-xs opacity-60 mt-2">{it.licenseHint}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}
'@
WriteUtf8NoBom "$Root\src\components\InfoFeed.tsx" $infoFeed

# ---- Tunisia info page with tabs
$tnPage = @'
import React, { useEffect, useMemo, useState } from "react";
import { TN_FEEDS, TN_TABS, type TnFeedCategory } from "../../lib/tnFeeds";
import { loadFeed, type FeedItem } from "../../lib/tnInfoService";
import InfoFeed from "../../components/InfoFeed";

export default function TunisiaInfoPage(){
  const [tab, setTab] = useState<TnFeedCategory>("news");
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [err, setErr] = useState<string>("");

  const feeds = useMemo(() => TN_FEEDS.filter(f => f.category === tab), [tab]);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true); setErr(""); setItems([]);
      try {
        const merged: FeedItem[] = [];
        for (const f of feeds) {
          const it = await loadFeed(f);
          merged.push(...it);
        }
        // naive sort by pubDate string (best-effort)
        merged.sort((a,b) => (b.pubDate || "").localeCompare(a.pubDate || ""));
        if (alive) setItems(merged);
      } catch (e: any) {
        if (alive) setErr(e?.message || "Erreur de chargement");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [tab, feeds]);

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Informations — Tunisie</h1>
          <p className="text-sm opacity-70">Flux web tunisiens (RSS) avec attribution. Ajoute d’autres sources dans src/lib/tnFeeds.ts</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {TN_TABS.map(t => (
            <button
              key={t.key}
              className={"px-3 py-2 rounded-xl border text-sm " + (tab === t.key ? "bg-muted" : "hover:bg-muted/30")}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <InfoFeed title={"Tunisie — " + (TN_TABS.find(x=>x.key===tab)?.label || tab)} items={items} loading={loading} error={err} />

      <div className="text-xs opacity-70 pt-3 border-t">
        <div className="font-medium mb-1">Médias (optionnel)</div>
        <div>Pour images/vidéos &lt; 45s : ajoute un proxy interne + une base “media_assets” (URL, auteur, licence, attribution) et n’affiche que du contenu légalement réutilisable.</div>
        <div className="mt-1">Astuce: tu peux définir VITE_NEWS_PROXY_URL pour éviter les soucis CORS (sinon fallback AllOrigins).</div>
      </div>
    </div>
  );
}
'@
WriteUtf8NoBom "$Root\src\pages\info\tunisia.tsx" $tnPage

# ---- Router patch: add /info/tunisia route + import (safe)
$routerPath = "$Root\src\router.tsx"
if(Test-Path $routerPath){
  $r = ReadUtf8 $routerPath
  if($r){
    Backup $routerPath

    if($r -notmatch "TunisiaInfoPage"){
      # add import after first import line
      $imp = "import TunisiaInfoPage from './pages/info/tunisia';"
      $r = [regex]::Replace($r, "^(import[^\r\n]*\r?\n)", "`$1$imp`r`n", 1)
      O "Router: import TunisiaInfoPage"
    }

    if($r -notmatch "path:\s*'\/info\/tunisia'"){
      # Try to inject inside routes array: add near other /info routes if present
      $routeLine = "  { path: '/info/tunisia', element: <TunisiaInfoPage /> },`r`n"
      if($r -match "path:\s*'\/info\/culture'"){
        $r = [regex]::Replace($r, "(path:\s*'\/info\/culture'[^\r\n]*\r?\n)", "$routeLine`$1", 1)
      } elseif($r -match "\[\s*\r?\n"){
        $r = [regex]::Replace($r, "(\[\s*\r?\n)", "`$1$routeLine", 1)
      } else {
        W "Router structure not detected; add route manually: /info/tunisia"
      }
      O "Router: route /info/tunisia"
    } else {
      W "Router: /info/tunisia already exists"
    }

    WriteUtf8NoBom $routerPath $r
  } else { W "router.tsx empty?" }
} else {
  W "Missing src/router.tsx (skip route patch)"
}

# ---- Objectives audit (file-scan based)
function ExistsAny($paths){
  foreach($p in $paths){ if(Test-Path $p){ return $true } }
  return $false
}

$checks = New-Object "System.Collections.Generic.List[Object]"
function AddCheck($name,$ok,$hint){
  $checks.Add([PSCustomObject]@{ Item=$name; OK=$ok; Hint=$hint }) | Out-Null
}

AddCheck "Dashboard UI" (ExistsAny @("$Root\src\pages\dashboard.tsx","$Root\src\pages\dashboard\index.tsx","$Root\src\pages\DashboardPage.tsx")) "Tableau de bord central"
AddCheck "Social UI" (ExistsAny @("$Root\src\pages\social","$Root\src\pages\SocialPage.tsx")) "Feed + rooms + messages"
AddCheck "Infos (Culture/Sport/Politics)" (ExistsAny @("$Root\src\pages\info\culture.tsx","$Root\src\pages\info\sport.tsx","$Root\src\pages\info\politics.tsx")) "Pages info existantes"
AddCheck "Infos Tunisie (feeds)" (Test-Path "$Root\src\pages\info\tunisia.tsx") "Flux RSS tunisiens + attribution"
AddCheck "E-learning Courses" (ExistsAny @("$Root\src\pages\courses","$Root\src\lib\courseService.ts")) "Cours / catalogue"
AddCheck "Exam Generator UI" (ExistsAny @("$Root\src\pages\exams.tsx","$Root\src\pages\exams","$Root\src\lib\examAiService.ts")) "Génération examens"
AddCheck "Certificates UI" (ExistsAny @("$Root\src\pages\certificates.tsx","$Root\src\pages\certificates")) "Certificats"
AddCheck "Live Classes (WebRTC UI)" (ExistsAny @("$Root\src\pages\live.tsx","$Root\src\pages\live")) "WebRTC côté UI"
AddCheck "Notifications UI" (ExistsAny @("$Root\src\pages\notifications.tsx","$Root\src\pages\notifications")) "Notifications"
AddCheck "Admin UI" (ExistsAny @("$Root\src\pages\admin.tsx","$Root\src\pages\admin")) "Admin"
AddCheck "Supabase SQL docs" (ExistsAny @("$Root\docs\sql","$Root\supabase")) "SQL schema + policies"

$md = New-Object System.Text.StringBuilder
[void]$md.AppendLine("# DONIA — Objectifs : état d'avancement (scan local)")
[void]$md.AppendLine("")
[void]$md.AppendLine("- Root: " + $Root)
[void]$md.AppendLine("- Generated: " + (Get-Date))
[void]$md.AppendLine("")
[void]$md.AppendLine("## Checklist modules")
[void]$md.AppendLine("")
foreach($c in $checks){
  $mark = "❌"
  if($c.OK){ $mark = "✅" }
  [void]$md.AppendLine("- " + $mark + " " + $c.Item + " — " + $c.Hint)
}
[void]$md.AppendLine("")
[void]$md.AppendLine("## Notes")
[void]$md.AppendLine("- Pour éviter CORS sur certains flux: définir `VITE_NEWS_PROXY_URL` (proxy interne). Sinon fallback public AllOrigins.")
[void]$md.AppendLine("- Les médias (images/vidéos) doivent être légaux, attribués, et idéalement stockés dans une table 'media_assets' (URL, auteur, licence, attribution).")
[void]$md.AppendLine("- Ajoute d'autres flux tunisiens dans `src/lib/tnFeeds.ts` (catégories politics/sport/culture).")

WriteUtf8NoBom "$Root\docs\OBJECTIFS_STATUS.md" $md.ToString()

I "DONE ✅"
I "Next steps:"
Write-Host "  1) npm run dev" -ForegroundColor Gray
Write-Host "  2) Open: http://localhost:8080/info/tunisia" -ForegroundColor Gray
Write-Host "  3) If CORS issues: set VITE_NEWS_PROXY_URL (optional) then restart dev" -ForegroundColor Gray
Write-Host "  4) Read objectives: docs/OBJECTIFS_STATUS.md" -ForegroundColor Gray
