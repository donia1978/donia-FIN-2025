param(
  [string]$Root = "C:\lovable\doniasocial"
)

$ErrorActionPreference = "Stop"

function Info($m){ Write-Host "[INFO] $m" -ForegroundColor Cyan }
function Ok($m){ Write-Host "[OK]  $m" -ForegroundColor Green }
function Warn($m){ Write-Host "[WARN] $m" -ForegroundColor Yellow }
function Die($m){ Write-Host "[ERR] $m" -ForegroundColor Red; throw $m }

if(!(Test-Path -LiteralPath $Root)){ Die "Root not found: $Root" }
Set-Location $Root

function Ensure-Dir([string]$p){
  if(!(Test-Path -LiteralPath $p)){
    New-Item -ItemType Directory -Force -Path $p | Out-Null
    Ok "DIR  + $p"
  }
}

function Write-UTF8([string]$path, [string]$content){
  $dir = Split-Path -Parent $path
  if($dir -and !(Test-Path -LiteralPath $dir)){ New-Item -ItemType Directory -Force -Path $dir | Out-Null }
  [System.IO.File]::WriteAllText($path, $content, [System.Text.Encoding]::UTF8)
  Ok "WRITE $path"
}

function Read-UTF8([string]$path){
  if(!(Test-Path -LiteralPath $path)){ return $null }
  return [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)
}

# ---------------------------
# 0) Folders
# ---------------------------
Ensure-Dir (Join-Path $Root "src\lib")
Ensure-Dir (Join-Path $Root "src\pages")
Ensure-Dir (Join-Path $Root "src\pages\info")
Ensure-Dir (Join-Path $Root "src\pages\info\culture")
Ensure-Dir (Join-Path $Root "src\pages\info\sport")
Ensure-Dir (Join-Path $Root "src\pages\info\politics")
Ensure-Dir (Join-Path $Root "src\pages\admin")
Ensure-Dir (Join-Path $Root "src\pages\notifications")
Ensure-Dir (Join-Path $Root "src\pages\social")
Ensure-Dir (Join-Path $Root "src\pages\social\groups")
Ensure-Dir (Join-Path $Root "src\pages\social\pages")
Ensure-Dir (Join-Path $Root "docs\sql")

# ---------------------------
# 1) Supabase client exists
# ---------------------------
$sbPath = Join-Path $Root "src\lib\supabaseClient.ts"
if(!(Test-Path -LiteralPath $sbPath)){
  Die "Missing src\lib\supabaseClient.ts. Fix Supabase client first."
}

# ---------------------------
# 2) SQL schema (Info + Admin + Notifications + Groups/Pages)
# ---------------------------
$sqlPath = Join-Path $Root "docs\sql\info_admin_notifications_socialplus.sql"
$sql = @'
-- DONIA: Info Hub (culture/sport/politics) + Admin + Notifications + Social Groups/Pages
-- Media model requires attribution/licence/source fields.

create table if not exists public.roles (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  created_at timestamptz not null default now()
);

create table if not exists public.user_roles (
  user_id uuid not null,
  role_id uuid not null references public.roles(id) on delete cascade,
  granted_by uuid null,
  created_at timestamptz not null default now(),
  primary key (user_id, role_id)
);

insert into public.roles(name) values ('admin') on conflict do nothing;

create or replace function public.is_admin(uid uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.user_id = uid and r.name = 'admin'
  );
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  country text,
  created_at timestamptz not null default now()
);

create table if not exists public.info_items (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in ('culture','sport','politics')),
  country text not null default 'TN',
  title text not null,
  summary text null,
  event_date timestamptz null,
  price_min numeric null,
  price_max numeric null,
  currency text null default 'TND',
  location text null,
  tags text[] null default '{}',

  media_type text null check (media_type in ('image','video','none')),
  media_url text null,
  media_thumb_url text null,

  source_name text not null default 'unknown',
  source_url text not null default 'unknown',
  license_name text not null default 'unknown',
  license_url text not null default 'unknown',
  attribution_text text not null default 'unknown',

  status text not null default 'draft' check (status in ('draft','published','archived')),
  created_by uuid null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists info_items_category_idx on public.info_items(category);
create index if not exists info_items_country_idx on public.info_items(country);
create index if not exists info_items_status_idx on public.info_items(status);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end; $$;

drop trigger if exists trg_info_items_updated on public.info_items;
create trigger trg_info_items_updated
before update on public.info_items
for each row execute function public.set_updated_at();

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  body text null,
  module text null,
  level text not null default 'info' check (level in ('info','success','warning','danger')),
  is_read boolean not null default false,
  action_url text null,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_idx on public.notifications(user_id);
create index if not exists notifications_read_idx on public.notifications(user_id, is_read);

create table if not exists public.social_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text null,
  country text not null default 'TN',
  is_public boolean not null default true,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.social_group_members (
  group_id uuid not null references public.social_groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('member','moderator','owner')),
  created_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create table if not exists public.social_group_posts (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.social_groups(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists group_posts_group_idx on public.social_group_posts(group_id);

create table if not exists public.social_pages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text null,
  country text not null default 'TN',
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.social_page_posts (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.social_pages(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists page_posts_page_idx on public.social_page_posts(page_id);

alter table public.info_items enable row level security;
alter table public.notifications enable row level security;
alter table public.profiles enable row level security;
alter table public.social_groups enable row level security;
alter table public.social_group_members enable row level security;
alter table public.social_group_posts enable row level security;
alter table public.social_pages enable row level security;
alter table public.social_page_posts enable row level security;

drop policy if exists "info_select_published_or_owner_or_admin" on public.info_items;
create policy "info_select_published_or_owner_or_admin"
on public.info_items for select
using (status = 'published' or created_by = auth.uid() or public.is_admin(auth.uid()));

drop policy if exists "info_insert_admin" on public.info_items;
create policy "info_insert_admin"
on public.info_items for insert
with check (public.is_admin(auth.uid()));

drop policy if exists "info_update_admin" on public.info_items;
create policy "info_update_admin"
on public.info_items for update
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

drop policy if exists "info_delete_admin" on public.info_items;
create policy "info_delete_admin"
on public.info_items for delete
using (public.is_admin(auth.uid()));

drop policy if exists "notif_select_own_or_admin" on public.notifications;
create policy "notif_select_own_or_admin"
on public.notifications for select
using (auth.uid() = user_id or public.is_admin(auth.uid()));

drop policy if exists "notif_update_own" on public.notifications;
create policy "notif_update_own"
on public.notifications for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "notif_insert_admin" on public.notifications;
create policy "notif_insert_admin"
on public.notifications for insert
with check (public.is_admin(auth.uid()));

drop policy if exists "groups_select_public_or_member_or_admin" on public.social_groups;
create policy "groups_select_public_or_member_or_admin"
on public.social_groups for select
using (
  is_public = true
  or public.is_admin(auth.uid())
  or exists(select 1 from public.social_group_members m where m.group_id = id and m.user_id = auth.uid())
);

drop policy if exists "groups_insert_auth" on public.social_groups;
create policy "groups_insert_auth"
on public.social_groups for insert
with check (auth.uid() = created_by);

drop policy if exists "group_members_insert_self" on public.social_group_members;
create policy "group_members_insert_self"
on public.social_group_members for insert
with check (auth.uid() = user_id);

drop policy if exists "group_posts_select" on public.social_group_posts;
create policy "group_posts_select"
on public.social_group_posts for select
using (
  public.is_admin(auth.uid())
  or exists(select 1 from public.social_group_members m where m.group_id = group_id and m.user_id = auth.uid())
  or exists(select 1 from public.social_groups g where g.id = group_id and g.is_public = true)
);

drop policy if exists "group_posts_insert_member" on public.social_group_posts;
create policy "group_posts_insert_member"
on public.social_group_posts for insert
with check (
  auth.uid() = author_id
  and exists(select 1 from public.social_group_members m where m.group_id = group_id and m.user_id = auth.uid())
);

drop policy if exists "pages_select_all" on public.social_pages;
create policy "pages_select_all" on public.social_pages for select using (true);

drop policy if exists "pages_insert_auth" on public.social_pages;
create policy "pages_insert_auth" on public.social_pages for insert with check (auth.uid() = created_by);

drop policy if exists "page_posts_select_all" on public.social_page_posts;
create policy "page_posts_select_all" on public.social_page_posts for select using (true);

drop policy if exists "page_posts_insert_auth" on public.social_page_posts;
create policy "page_posts_insert_auth" on public.social_page_posts for insert with check (auth.uid() = author_id);
'@
Write-UTF8 $sqlPath $sql

# ---------------------------
# 3) Services
# ---------------------------
Write-UTF8 (Join-Path $Root "src\lib\infoService.ts") @'
import { supabase } from "./supabaseClient";

export type InfoCategory = "culture" | "sport" | "politics";

export type InfoItem = {
  id: string;
  category: InfoCategory;
  country: string;
  title: string;
  summary?: string | null;
  event_date?: string | null;
  price_min?: number | null;
  price_max?: number | null;
  currency?: string | null;
  location?: string | null;
  tags?: string[] | null;
  media_type?: "image" | "video" | "none" | null;
  media_url?: string | null;
  media_thumb_url?: string | null;

  source_name: string;
  source_url: string;
  license_name: string;
  license_url: string;
  attribution_text: string;

  status: "draft" | "published" | "archived";
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
};

export async function listInfo(category: InfoCategory, country?: string) {
  let q = supabase
    .from("info_items")
    .select("*")
    .eq("category", category)
    .order("event_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (country) q = q.eq("country", country);

  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as InfoItem[];
}
'@

Write-UTF8 (Join-Path $Root "src\lib\notificationsService.ts") @'
import { supabase } from "./supabaseClient";

export type NotificationItem = {
  id: string;
  user_id: string;
  title: string;
  body?: string | null;
  module?: string | null;
  level: "info" | "success" | "warning" | "danger";
  is_read: boolean;
  action_url?: string | null;
  created_at: string;
};

export async function listMyNotifications() {
  const { data: u } = await supabase.auth.getUser();
  const me = u.user;
  if (!me) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", me.id)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) throw error;
  return (data ?? []) as NotificationItem[];
}
'@

# ---------------------------
# 4) UI Info pages
# ---------------------------
Write-UTF8 (Join-Path $Root "src\pages\info\_InfoList.tsx") @'
import React, { useEffect, useMemo, useState } from "react";
import { InfoCategory, InfoItem, listInfo } from "../../lib/infoService";

function Badge({ text }: { text: string }) {
  return <span style={{ fontSize: 12, padding: "2px 8px", borderRadius: 999, background: "#f3f4f6" }}>{text}</span>;
}

function MediaCard({ item }: { item: InfoItem }) {
  if (!item.media_url || item.media_type === "none") return null;

  if (item.media_type === "image") {
    return (
      <div style={{ marginTop: 10 }}>
        <img src={item.media_url} alt={item.title} style={{ width: "100%", borderRadius: 12, border: "1px solid #e5e5e5" }} />
      </div>
    );
  }

  if (item.media_type === "video") {
    return (
      <div style={{ marginTop: 10 }}>
        <video controls style={{ width: "100%", borderRadius: 12, border: "1px solid #e5e5e5" }}>
          <source src={item.media_url} />
        </video>
      </div>
    );
  }

  return null;
}

export default function InfoList({ category }: { category: InfoCategory }) {
  const [country, setCountry] = useState("TN");
  const [q, setQ] = useState("");
  const [items, setItems] = useState<InfoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setErr(null);
        setLoading(true);
        const data = await listInfo(category, country);
        setItems(data);
      } catch (e: any) {
        setErr(e?.message || String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, [category, country]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return items;
    return items.filter((it) =>
      [it.title, it.summary, it.location, (it.tags || []).join(" "), it.source_name].join(" ").toLowerCase().includes(s)
    );
  }, [items, q]);

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>
          Informations • {category === "culture" ? "Culture" : category === "sport" ? "Sport" : "Politique"}
        </h2>
        <Badge text="médias + attribution" />
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10 }}>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher..." style={{ padding: 10, borderRadius: 8, border: "1px solid #ddd", minWidth: 260 }} />
        <input value={country} onChange={(e) => setCountry(e.target.value.toUpperCase())} placeholder="Pays (ex: TN)" style={{ padding: 10, borderRadius: 8, border: "1px solid #ddd", width: 120 }} />
        <a href="/admin" style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #ddd", textDecoration: "none" }}>
          Admin (publier)
        </a>
      </div>

      {err ? <div style={{ marginTop: 10, color: "#b91c1c" }}>{err}</div> : null}
      {loading ? (
        <div style={{ marginTop: 10 }}>Chargement...</div>
      ) : filtered.length === 0 ? (
        <div style={{ marginTop: 10 }}>Aucun contenu. Ajoute via Admin.</div>
      ) : (
        <div style={{ marginTop: 12, display: "grid", gap: 12 }}>
          {filtered.map((it) => (
            <div key={it.id} style={{ border: "1px solid #e5e5e5", borderRadius: 14, padding: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                <div style={{ fontWeight: 800 }}>{it.title}</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <Badge text={it.country} />
                  <Badge text={it.status} />
                  {it.event_date ? <Badge text={new Date(it.event_date).toLocaleDateString()} /> : null}
                </div>
              </div>

              {it.location ? <div style={{ marginTop: 6, opacity: 0.8 }}>📍 {it.location}</div> : null}
              {typeof it.price_min === "number" || typeof it.price_max === "number" ? (
                <div style={{ marginTop: 6, opacity: 0.9 }}>
                  💳 Prix : {it.price_min ?? 0} – {it.price_max ?? it.price_min ?? 0} {it.currency ?? "TND"}
                </div>
              ) : null}

              {it.summary ? <div style={{ marginTop: 10, opacity: 0.9 }}>{it.summary}</div> : null}

              <MediaCard item={it} />

              <div style={{ marginTop: 10, fontSize: 12, opacity: 0.85 }}>
                <div>Source : <a href={it.source_url} target="_blank" rel="noreferrer">{it.source_name}</a></div>
                <div>Licence : <a href={it.license_url} target="_blank" rel="noreferrer">{it.license_name}</a></div>
                <div>Attribution : {it.attribution_text}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
'@

Write-UTF8 (Join-Path $Root "src\pages\info\culture\index.tsx") @'
import React from "react";
import InfoList from "../_InfoList";
export default function CulturePage(){ return <InfoList category="culture" />; }
'@

Write-UTF8 (Join-Path $Root "src\pages\info\sport\index.tsx") @'
import React from "react";
import InfoList from "../_InfoList";
export default function SportPage(){ return <InfoList category="sport" />; }
'@

Write-UTF8 (Join-Path $Root "src\pages\info\politics\index.tsx") @'
import React from "react";
import InfoList from "../_InfoList";
export default function PoliticsPage(){ return <InfoList category="politics" />; }
'@

# ---------------------------
# 5) Create Admin/Notifications if missing (no JSX in PS parsing issue: pure text)
# ---------------------------
$adminTsx = Join-Path $Root "src\pages\admin\index.tsx"
if(!(Test-Path -LiteralPath $adminTsx)){
  Write-UTF8 $adminTsx @'
import React from "react";
export default function AdminPage(){
  return <div style={{padding:16}}>Admin UI déjà existante dans ton projet lovable. (Ici placeholder)</div>;
}
'@
  Ok "Admin placeholder created"
} else {
  Ok "Admin UI exists -> untouched"
}

$notifTsx = Join-Path $Root "src\pages\notifications\index.tsx"
if(!(Test-Path -LiteralPath $notifTsx)){
  Write-UTF8 $notifTsx @'
import React, { useEffect, useState } from "react";
import { listMyNotifications, NotificationItem } from "../../lib/notificationsService";

export default function NotificationsPage(){
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try{
        setErr(null);
        const data = await listMyNotifications();
        setItems(data);
      }catch(e:any){
        setErr(e?.message || String(e));
      }
    })();
  }, []);

  return (
    <div style={{padding:16}}>
      <h2 style={{fontSize:22,fontWeight:800,margin:0}}>Notifications</h2>
      {err ? <div style={{color:"#b91c1c",marginTop:10}}>{err}</div> : null}
      <div style={{marginTop:12,display:"grid",gap:10}}>
        {items.map(n => (
          <div key={n.id} style={{border:"1px solid #e5e5e5",borderRadius:12,padding:12}}>
            <div style={{fontWeight:800}}>{n.title}</div>
            {n.body ? <div style={{opacity:.85,marginTop:6}}>{n.body}</div> : null}
            <div style={{fontSize:12,opacity:.7,marginTop:8}}>
              {new Date(n.created_at).toLocaleString()} • {n.level}
            </div>
          </div>
        ))}
        {items.length===0 ? <div style={{opacity:.8}}>Aucune notification</div> : null}
      </div>
    </div>
  );
}
'@
  Ok "Notifications UI created"
} else {
  Ok "Notifications UI exists -> untouched"
}

# Groups/Pages stubs if missing
$groupsTsx = Join-Path $Root "src\pages\social\groups\index.tsx"
if(!(Test-Path -LiteralPath $groupsTsx)){
  Write-UTF8 $groupsTsx @'
import React from "react";
export default function GroupsPage(){ return <div style={{padding:16}}>Groups UI placeholder</div>; }
'@
  Ok "Groups placeholder created"
} else {
  Ok "Groups exists -> untouched"
}

$pagesTsx = Join-Path $Root "src\pages\social\pages\index.tsx"
if(!(Test-Path -LiteralPath $pagesTsx)){
  Write-UTF8 $pagesTsx @'
import React from "react";
export default function PagesPage(){ return <div style={{padding:16}}>Pages UI placeholder</div>; }
'@
  Ok "Pages placeholder created"
} else {
  Ok "Pages exists -> untouched"
}

# ---------------------------
# 6) Router patch (safe: only add imports/routes if missing)
# ---------------------------
$routerPath = Join-Path $Root "src\router.tsx"
$router = Read-UTF8 $routerPath
if($router){
  $r = $router

  $need = @(
    "import CulturePage from './pages/info/culture';",
    "import SportPage from './pages/info/sport';",
    "import PoliticsPage from './pages/info/politics';"
  )

  foreach($imp in $need){
    if($r -notmatch [regex]::Escape($imp)){
      $r = $r -replace "^(import .+?;)\s*$", ("`$1`r`n" + $imp), 1
    }
  }

  if($r -notmatch "/info/culture"){
    $block = @"
  // DONIA_INFO_ROUTES
  { path: '/info/culture', element: <CulturePage /> },
  { path: '/info/sport', element: <SportPage /> },
  { path: '/info/politics', element: <PoliticsPage /> },
"@
    if($r -match "\]\s*;"){
      $r = $r -replace "\]\s*;", ($block + "`r`n];")
    } else {
      Warn "Router array end not detected automatically. Add routes manually."
    }
  }

  Write-UTF8 $routerPath $r
  Ok "Router patched"
} else {
  Warn "src/router.tsx not found -> add routes manually"
}

# ---------------------------
# 7) Next steps doc
# ---------------------------
Write-UTF8 (Join-Path $Root "docs\INFO_ADMIN_NOTIFY_SOCIALPLUS_NEXT_STEPS.md") @'
# DONIA — Pack Info + Admin + Notifications + Social+

1) Supabase SQL Editor -> RUN:
docs/sql/info_admin_notifications_socialplus.sql

2) Local:
npm run dev

3) Pages:
- /info/culture
- /info/sport
- /info/politics
- /admin
- /notifications
- /social/groups
- /social/pages
'@

Ok "DONE ✅ V3 generated"
Write-Host "NEXT: Supabase SQL Editor -> RUN docs/sql/info_admin_notifications_socialplus.sql" -ForegroundColor Yellow
Write-Host "Then: npm run dev" -ForegroundColor Yellow
