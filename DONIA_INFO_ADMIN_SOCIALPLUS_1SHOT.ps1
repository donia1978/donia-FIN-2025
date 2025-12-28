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

function Read-Text([string]$path){
  if(!(Test-Path -LiteralPath $path)){ return $null }
  return [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)
}

# ---------------------------
# 0) Ensure folders
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
# 1) Supabase client must exist
# ---------------------------
$sbPath = Join-Path $Root "src\lib\supabaseClient.ts"
if(!(Test-Path -LiteralPath $sbPath)){
  Die "Missing src\lib\supabaseClient.ts. Run previous pack first."
}

# ---------------------------
# 2) SQL schema: info hub + notifications + groups/pages
# ---------------------------
Write-UTF8 (Join-Path $Root "docs\sql\info_admin_notifications_socialplus.sql") @'
-- DONIA: Info Hub (culture/sport/politics) + Admin + Notifications + Social Groups/Pages
-- Safe, legal media model: curated items with explicit attribution/licence fields.

-- Extensions (optional)
-- create extension if not exists "pgcrypto";

-- 1) ROLES (if not exist in your RBAC core)
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

insert into public.roles(name)
values ('admin')
on conflict do nothing;

-- Helper: is_admin
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

-- 2) PROFILES (minimal if not exist)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  country text,
  created_at timestamptz not null default now()
);

-- 3) INFO HUB (culture / sport / politics)
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
  -- Media (curated)
  media_type text null check (media_type in ('image','video','none')),
  media_url text null,
  media_thumb_url text null,
  -- Attribution / legal
  source_name text not null default 'unknown',
  source_url text not null default 'unknown',
  license_name text not null default 'unknown',
  license_url text not null default 'unknown',
  attribution_text text not null default 'unknown',
  -- Status
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

-- 4) NOTIFICATIONS (in-app)
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  body text null,
  module text null, -- education, medical, social, info, etc.
  level text not null default 'info' check (level in ('info','success','warning','danger')),
  is_read boolean not null default false,
  action_url text null,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_idx on public.notifications(user_id);
create index if not exists notifications_read_idx on public.notifications(user_id, is_read);

-- 5) SOCIAL GROUPS + PAGES
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

-- -----------------------
-- RLS
-- -----------------------
alter table public.info_items enable row level security;
alter table public.notifications enable row level security;
alter table public.profiles enable row level security;
alter table public.social_groups enable row level security;
alter table public.social_group_members enable row level security;
alter table public.social_group_posts enable row level security;
alter table public.social_pages enable row level security;
alter table public.social_page_posts enable row level security;

-- PROFILES: user can read/update own; admins read all
drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin"
on public.profiles for select
using (auth.uid() = id or public.is_admin(auth.uid()));

drop policy if exists "profiles_upsert_own" on public.profiles;
create policy "profiles_upsert_own"
on public.profiles for insert
with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles for update
using (auth.uid() = id)
with check (auth.uid() = id);

-- INFO: anyone can read published; admin can CRUD; creator can see own drafts
drop policy if exists "info_select_published_or_owner_or_admin" on public.info_items;
create policy "info_select_published_or_owner_or_admin"
on public.info_items for select
using (
  status = 'published'
  or created_by = auth.uid()
  or public.is_admin(auth.uid())
);

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

-- NOTIFICATIONS: user reads own; admin can insert for any user
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

drop policy if exists "notif_delete_admin" on public.notifications;
create policy "notif_delete_admin"
on public.notifications for delete
using (public.is_admin(auth.uid()));

-- SOCIAL GROUPS
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

drop policy if exists "groups_update_owner_or_admin" on public.social_groups;
create policy "groups_update_owner_or_admin"
on public.social_groups for update
using (
  public.is_admin(auth.uid())
  or exists(select 1 from public.social_group_members m where m.group_id = id and m.user_id = auth.uid() and m.role in ('owner','moderator'))
);

drop policy if exists "groups_delete_admin" on public.social_groups;
create policy "groups_delete_admin"
on public.social_groups for delete
using (public.is_admin(auth.uid()));

-- GROUP MEMBERS: user can join public group; owner/mod/admin manage
drop policy if exists "group_members_select_member_or_admin" on public.social_group_members;
create policy "group_members_select_member_or_admin"
on public.social_group_members for select
using (user_id = auth.uid() or public.is_admin(auth.uid())
  or exists(select 1 from public.social_group_members m where m.group_id = group_id and m.user_id = auth.uid())
);

drop policy if exists "group_members_insert_self" on public.social_group_members;
create policy "group_members_insert_self"
on public.social_group_members for insert
with check (auth.uid() = user_id);

drop policy if exists "group_members_delete_self_or_admin" on public.social_group_members;
create policy "group_members_delete_self_or_admin"
on public.social_group_members for delete
using (auth.uid() = user_id or public.is_admin(auth.uid()));

-- GROUP POSTS: member can post; visible by group policy
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

-- SOCIAL PAGES: readable by all; create by auth; admin can delete
drop policy if exists "pages_select_all" on public.social_pages;
create policy "pages_select_all"
on public.social_pages for select
using (true);

drop policy if exists "pages_insert_auth" on public.social_pages;
create policy "pages_insert_auth"
on public.social_pages for insert
with check (auth.uid() = created_by);

drop policy if exists "pages_update_owner_or_admin" on public.social_pages;
create policy "pages_update_owner_or_admin"
on public.social_pages for update
using (public.is_admin(auth.uid()) or auth.uid() = created_by);

drop policy if exists "pages_delete_admin" on public.social_pages;
create policy "pages_delete_admin"
on public.social_pages for delete
using (public.is_admin(auth.uid()));

-- PAGE POSTS: any auth can post
drop policy if exists "page_posts_select_all" on public.social_page_posts;
create policy "page_posts_select_all"
on public.social_page_posts for select
using (true);

drop policy if exists "page_posts_insert_auth" on public.social_page_posts;
create policy "page_posts_insert_auth"
on public.social_page_posts for insert
with check (auth.uid() = author_id);
'@

# ---------------------------
# 3) Services: info + notifications + social groups/pages
# ---------------------------

Write-UTF8 (Join-Path $Root "src\lib\rbac.ts") @'
import { supabase } from "./supabaseClient";

export async function getMe() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  return data.user;
}

export async function isAdmin(): Promise<boolean> {
  const me = await getMe();
  if (!me) return false;

  const { data, error } = await supabase
    .from("user_roles")
    .select("roles(name)")
    .eq("user_id", me.id);

  if (error) return false;

  const names = (data ?? [])
    .map((x: any) => x?.roles?.name)
    .filter(Boolean);

  return names.includes("admin");
}
'@

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

export async function upsertInfo(item: Partial<InfoItem>) {
  const { data, error } = await supabase
    .from("info_items")
    .upsert(item)
    .select("*")
    .single();
  if (error) throw error;
  return data as InfoItem;
}

export async function deleteInfo(id: string) {
  const { error } = await supabase.from("info_items").delete().eq("id", id);
  if (error) throw error;
  return true;
}
'@

Write-UTF8 (Join-Path $Root "src\lib/notificationsService.ts") @'
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

export async function markRead(id: string, is_read: boolean) {
  const { data, error } = await supabase
    .from("notifications")
    .update({ is_read })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data as NotificationItem;
}
'@

Write-UTF8 (Join-Path $Root "src\lib\socialPlusService.ts") @'
import { supabase } from "./supabaseClient";

export type Group = {
  id: string;
  name: string;
  description?: string | null;
  country: string;
  is_public: boolean;
  created_by: string;
  created_at: string;
};

export type GroupPost = {
  id: string;
  group_id: string;
  author_id: string;
  content: string;
  created_at: string;
};

export type Page = {
  id: string;
  name: string;
  description?: string | null;
  country: string;
  created_by: string;
  created_at: string;
};

export type PagePost = {
  id: string;
  page_id: string;
  author_id: string;
  content: string;
  created_at: string;
};

async function meId() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!data.user) throw new Error("Not authenticated");
  return data.user.id;
}

export async function listGroups() {
  const { data, error } = await supabase.from("social_groups").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Group[];
}

export async function createGroup(input: Partial<Group>) {
  const id = await meId();
  const payload = {
    name: input.name ?? "New group",
    description: input.description ?? null,
    country: input.country ?? "TN",
    is_public: input.is_public ?? true,
    created_by: id,
  };
  const { data, error } = await supabase.from("social_groups").insert(payload).select("*").single();
  if (error) throw error;

  // owner membership
  await supabase.from("social_group_members").insert({ group_id: data.id, user_id: id, role: "owner" });
  return data as Group;
}

export async function joinGroup(group_id: string) {
  const id = await meId();
  const { error } = await supabase.from("social_group_members").insert({ group_id, user_id: id, role: "member" });
  if (error) throw error;
  return true;
}

export async function listGroupPosts(group_id: string) {
  const { data, error } = await supabase
    .from("social_group_posts")
    .select("*")
    .eq("group_id", group_id)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return (data ?? []) as GroupPost[];
}

export async function addGroupPost(group_id: string, content: string) {
  const id = await meId();
  const { data, error } = await supabase
    .from("social_group_posts")
    .insert({ group_id, author_id: id, content })
    .select("*")
    .single();
  if (error) throw error;
  return data as GroupPost;
}

export async function listPages() {
  const { data, error } = await supabase.from("social_pages").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Page[];
}

export async function createPage(input: Partial<Page>) {
  const id = await meId();
  const payload = { name: input.name ?? "New page", description: input.description ?? null, country: input.country ?? "TN", created_by: id };
  const { data, error } = await supabase.from("social_pages").insert(payload).select("*").single();
  if (error) throw error;
  return data as Page;
}

export async function listPagePosts(page_id: string) {
  const { data, error } = await supabase
    .from("social_page_posts")
    .select("*")
    .eq("page_id", page_id)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return (data ?? []) as PagePost[];
}

export async function addPagePost(page_id: string, content: string) {
  const id = await meId();
  const { data, error } = await supabase.from("social_page_posts").insert({ page_id, author_id: id, content }).select("*").single();
  if (error) throw error;
  return data as PagePost;
}
'@

# ---------------------------
# 4) UI Pages
# ---------------------------

# Shared info UI component (simple inline)
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
        <Badge text="médias curés + attribution" />
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
                <div>
                  Source :{" "}
                  <a href={it.source_url} target="_blank" rel="noreferrer">
                    {it.source_name}
                  </a>
                </div>
                <div>
                  Licence :{" "}
                  <a href={it.license_url} target="_blank" rel="noreferrer">
                    {it.license_name}
                  </a>
                </div>
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

# Admin UI
Write-UTF8 (Join-Path $Root "src\pages\admin\index.tsx") @'
import React, { useEffect, useMemo, useState } from "react";
import { isAdmin } from "../../lib/rbac";
import { InfoItem, upsertInfo, deleteInfo, listInfo } from "../../lib/infoService";

const emptyItem: Partial<InfoItem> = {
  category: "culture",
  country: "TN",
  title: "",
  summary: "",
  status: "draft",
  media_type: "none",
  media_url: "",
  source_name: "",
  source_url: "",
  license_name: "",
  license_url: "",
  attribution_text: "",
};

function InputRow({ label, children }: any) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <div style={{ fontSize: 12, opacity: 0.8 }}>{label}</div>
      {children}
    </label>
  );
}

export default function AdminPage() {
  const [okAdmin, setOkAdmin] = useState<boolean | null>(null);
  const [tab, setTab] = useState<"culture" | "sport" | "politics">("culture");
  const [items, setItems] = useState<InfoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  const [draft, setDraft] = useState<Partial<InfoItem>>({ ...emptyItem });

  async function refresh() {
    setLoading(true);
    try {
      const data = await listInfo(tab, "TN");
      setItems(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    (async () => {
      const a = await isAdmin();
      setOkAdmin(a);
    })();
  }, []);

  useEffect(() => {
    refresh().catch((e) => setMsg(String(e?.message || e)));
    setDraft({ ...emptyItem, category: tab, country: "TN" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const canSave = useMemo(() => {
    return (
      (draft.title || "").trim().length >= 3 &&
      (draft.source_name || "").trim().length >= 2 &&
      (draft.source_url || "").trim().length >= 5 &&
      (draft.license_name || "").trim().length >= 2 &&
      (draft.license_url || "").trim().length >= 5 &&
      (draft.attribution_text || "").trim().length >= 2
    );
  }, [draft]);

  if (okAdmin === false) {
    return (
      <div style={{ padding: 16 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700 }}>Admin</h2>
        <div style={{ color: "#b91c1c" }}>Accès refusé : rôle admin requis.</div>
      </div>
    );
  }

  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ fontSize: 22, fontWeight: 700 }}>Admin • Publications</h2>
      <p style={{ opacity: 0.8 }}>Ajoute des contenus légaux avec attribution (image/vidéo) puis publie.</p>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", margin: "10px 0" }}>
        <button onClick={() => setTab("culture")} style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #ddd" }}>Culture</button>
        <button onClick={() => setTab("sport")} style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #ddd" }}>Sport</button>
        <button onClick={() => setTab("politics")} style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #ddd" }}>Politique</button>
        <a href={`/info/${tab}`} style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #ddd", textDecoration: "none" }}>Voir page</a>
      </div>

      {msg ? <div style={{ color: "#0f766e", marginBottom: 10 }}>{msg}</div> : null}

      <div style={{ border: "1px solid #e5e5e5", borderRadius: 14, padding: 12, maxWidth: 820 }}>
        <h3 style={{ marginTop: 0 }}>Créer / Mettre à jour</h3>

        <div style={{ display: "grid", gap: 10 }}>
          <InputRow label="Titre">
            <input value={draft.title || ""} onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))} style={{ padding: 10, borderRadius: 8, border: "1px solid #ddd" }} />
          </InputRow>

          <InputRow label="Résumé">
            <textarea value={draft.summary || ""} onChange={(e) => setDraft((d) => ({ ...d, summary: e.target.value }))} rows={3} style={{ padding: 10, borderRadius: 8, border: "1px solid #ddd" }} />
          </InputRow>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <InputRow label="Pays (ex: TN)">
              <input value={draft.country || "TN"} onChange={(e) => setDraft((d) => ({ ...d, country: e.target.value.toUpperCase() }))} style={{ padding: 10, borderRadius: 8, border: "1px solid #ddd" }} />
            </InputRow>
            <InputRow label="Statut">
              <select value={draft.status || "draft"} onChange={(e) => setDraft((d) => ({ ...d, status: e.target.value as any }))} style={{ padding: 10, borderRadius: 8, border: "1px solid #ddd" }}>
                <option value="draft">draft</option>
                <option value="published">published</option>
                <option value="archived">archived</option>
              </select>
            </InputRow>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <InputRow label="Type média">
              <select value={draft.media_type || "none"} onChange={(e) => setDraft((d) => ({ ...d, media_type: e.target.value as any }))} style={{ padding: 10, borderRadius: 8, border: "1px solid #ddd" }}>
                <option value="none">none</option>
                <option value="image">image</option>
                <option value="video">video</option>
              </select>
            </InputRow>
            <InputRow label="URL média (image/vidéo)">
              <input value={draft.media_url || ""} onChange={(e) => setDraft((d) => ({ ...d, media_url: e.target.value }))} style={{ padding: 10, borderRadius: 8, border: "1px solid #ddd" }} />
            </InputRow>
          </div>

          <h4 style={{ margin: "10px 0 0" }}>Attribution (obligatoire)</h4>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <InputRow label="Source name">
              <input value={draft.source_name || ""} onChange={(e) => setDraft((d) => ({ ...d, source_name: e.target.value }))} style={{ padding: 10, borderRadius: 8, border: "1px solid #ddd" }} />
            </InputRow>
            <InputRow label="Source URL">
              <input value={draft.source_url || ""} onChange={(e) => setDraft((d) => ({ ...d, source_url: e.target.value }))} style={{ padding: 10, borderRadius: 8, border: "1px solid #ddd" }} />
            </InputRow>
            <InputRow label="Licence name">
              <input value={draft.license_name || ""} onChange={(e) => setDraft((d) => ({ ...d, license_name: e.target.value }))} style={{ padding: 10, borderRadius: 8, border: "1px solid #ddd" }} />
            </InputRow>
            <InputRow label="Licence URL">
              <input value={draft.license_url || ""} onChange={(e) => setDraft((d) => ({ ...d, license_url: e.target.value }))} style={{ padding: 10, borderRadius: 8, border: "1px solid #ddd" }} />
            </InputRow>
          </div>

          <InputRow label="Attribution text (ex: © Auteur / Organisation, année)">
            <input value={draft.attribution_text || ""} onChange={(e) => setDraft((d) => ({ ...d, attribution_text: e.target.value }))} style={{ padding: 10, borderRadius: 8, border: "1px solid #ddd" }} />
          </InputRow>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              disabled={!canSave}
              onClick={async () => {
                setMsg(null);
                try {
                  await upsertInfo({ ...draft, category: tab });
                  setMsg("Enregistré ✅");
                  setDraft({ ...emptyItem, category: tab, country: "TN" });
                  await refresh();
                } catch (e: any) {
                  setMsg(e?.message || String(e));
                }
              }}
              style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #ddd", opacity: canSave ? 1 : 0.5 }}
            >
              Save
            </button>

            <button
              onClick={() => setDraft({ ...emptyItem, category: tab, country: "TN" })}
              style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #ddd" }}
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      <h3 style={{ marginTop: 16 }}>Liste</h3>
      {loading ? (
        <div>Chargement...</div>
      ) : items.length === 0 ? (
        <div>Aucun item.</div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {items.map((it) => (
            <div key={it.id} style={{ border: "1px solid #e5e5e5", borderRadius: 14, padding: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                <div style={{ fontWeight: 800 }}>{it.title}</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 12, padding: "2px 8px", borderRadius: 999, background: "#f3f4f6" }}>{it.status}</span>
                  <button
                    onClick={async () => {
                      setMsg(null);
                      try {
                        await deleteInfo(it.id);
                        setMsg("Supprimé ✅");
                        await refresh();
                      } catch (e: any) {
                        setMsg(e?.message || String(e));
                      }
                    }}
                    style={{ padding: "6px 10px", borderRadius: 10, border: "1px solid #ddd" }}
                  >
                    Delete
                  </button>
                </div>
              </div>
              <div style={{ marginTop: 6, opacity: 0.85 }}>Source: {it.source_name}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
'@

# Notifications UI
Write-UTF8 (Join-Path $Root "src\pages\notifications\index.tsx") @'
import React, { useEffect, useState } from "react";
import { listMyNotifications, markRead, NotificationItem } from "../../lib/notificationsService";

function Pill({ level }: { level: string }) {
  const bg = level === "danger" ? "#fee2e2" : level === "warning" ? "#fef3c7" : level === "success" ? "#dcfce7" : "#e5e7eb";
  return <span style={{ fontSize: 12, padding: "2px 8px", borderRadius: 999, background: bg }}>{level}</span>;
}

export default function NotificationsPage() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    try {
      const data = await listMyNotifications();
      setItems(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { refresh().catch((e) => setMsg(String(e?.message || e))); }, []);

  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ fontSize: 22, fontWeight: 700 }}>Notifications</h2>
      <p style={{ opacity: 0.8 }}>In-app notifications (Supabase)</p>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", margin: "10px 0" }}>
        <button onClick={() => refresh().catch((e) => setMsg(String(e?.message || e)))} style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #ddd" }}>
          Rafraîchir
        </button>
      </div>

      {msg ? <div style={{ color: "#0f766e" }}>{msg}</div> : null}

      {loading ? (
        <div>Chargement...</div>
      ) : items.length === 0 ? (
        <div>Aucune notification.</div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {items.map((n) => (
            <div key={n.id} style={{ border: "1px solid #e5e5e5", borderRadius: 14, padding: 12, opacity: n.is_read ? 0.75 : 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                <div style={{ fontWeight: 800 }}>{n.title}</div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <Pill level={n.level} />
                  <span style={{ fontSize: 12, opacity: 0.8 }}>{new Date(n.created_at).toLocaleString()}</span>
                </div>
              </div>

              {n.body ? <div style={{ marginTop: 8, opacity: 0.9 }}>{n.body}</div> : null}
              {n.action_url ? (
                <div style={{ marginTop: 8 }}>
                  <a href={n.action_url}>Ouvrir</a>
                </div>
              ) : null}

              <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                {!n.is_read ? (
                  <button
                    onClick={async () => {
                      await markRead(n.id, true);
                      await refresh();
                    }}
                    style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #ddd" }}
                  >
                    Marquer lu
                  </button>
                ) : (
                  <button
                    onClick={async () => {
                      await markRead(n.id, false);
                      await refresh();
                    }}
                    style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #ddd" }}
                  >
                    Marquer non-lu
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
'@

# Social Groups UI + call buttons
Write-UTF8 (Join-Path $Root "src\pages\social\groups\index.tsx") @'
import React, { useEffect, useState } from "react";
import { addGroupPost, createGroup, joinGroup, listGroupPosts, listGroups } from "../../../lib/socialPlusService";

function CallButtons({ roomId }: { roomId: string }) {
  const base = "/live";
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      <a href={`${base}?room=${encodeURIComponent(roomId)}&mode=audio`} style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #ddd", textDecoration: "none" }}>
        Audio call
      </a>
      <a href={`${base}?room=${encodeURIComponent(roomId)}&mode=video`} style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #ddd", textDecoration: "none" }}>
        Video call
      </a>
    </div>
  );
}

export default function GroupsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  async function refresh() {
    const g = await listGroups();
    setItems(g);
  }

  async function openGroup(g: any) {
    setSelected(g);
    const p = await listGroupPosts(g.id);
    setPosts(p);
  }

  useEffect(() => { refresh().catch((e) => setMsg(String(e?.message || e))); }, []);

  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ fontSize: 22, fontWeight: 800 }}>Groupes</h2>
      <p style={{ opacity: 0.8 }}>Création + posts + boutons audio/vidéo (deep link WebRTC)</p>

      {msg ? <div style={{ color: "#0f766e", marginBottom: 10 }}>{msg}</div> : null}

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", margin: "10px 0" }}>
        <button
          onClick={async () => {
            setMsg(null);
            try {
              const g = await createGroup({ name: "Groupe " + new Date().toISOString().slice(0,10), is_public: true, country: "TN" });
              setMsg("Groupe créé ✅");
              await refresh();
              await openGroup(g);
            } catch (e: any) {
              setMsg(e?.message || String(e));
            }
          }}
          style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #ddd" }}
        >
          + Créer groupe
        </button>

        {selected ? <CallButtons roomId={`group-${selected.id}`} /> : null}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: 12 }}>
        <div style={{ border: "1px solid #e5e5e5", borderRadius: 14, padding: 12 }}>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>Liste</div>
          {items.length === 0 ? (
            <div>Aucun groupe.</div>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              {items.map((g) => (
                <div key={g.id} style={{ border: "1px solid #eee", borderRadius: 12, padding: 10 }}>
                  <div style={{ fontWeight: 700 }}>{g.name}</div>
                  <div style={{ fontSize: 12, opacity: 0.8 }}>{g.country} • {g.is_public ? "public" : "private"}</div>

                  <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                    <button onClick={() => openGroup(g)} style={{ padding: "6px 10px", borderRadius: 10, border: "1px solid #ddd" }}>Ouvrir</button>
                    <button
                      onClick={async () => {
                        setMsg(null);
                        try {
                          await joinGroup(g.id);
                          setMsg("Rejoint ✅");
                          await openGroup(g);
                        } catch (e: any) {
                          setMsg(e?.message || String(e));
                        }
                      }}
                      style={{ padding: "6px 10px", borderRadius: 10, border: "1px solid #ddd" }}
                    >
                      Rejoindre
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ border: "1px solid #e5e5e5", borderRadius: 14, padding: 12 }}>
          {!selected ? (
            <div>Sélectionne un groupe.</div>
          ) : (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontWeight: 900, fontSize: 18 }}>{selected.name}</div>
                  <div style={{ fontSize: 12, opacity: 0.8 }}>Room: group-{selected.id}</div>
                </div>
                <CallButtons roomId={`group-${selected.id}`} />
              </div>

              <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
                <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Écrire un post..." style={{ flex: 1, padding: 10, borderRadius: 10, border: "1px solid #ddd" }} />
                <button
                  onClick={async () => {
                    if (!text.trim()) return;
                    const content = text.trim();
                    setText("");
                    await addGroupPost(selected.id, content);
                    const p = await listGroupPosts(selected.id);
                    setPosts(p);
                  }}
                  style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #ddd" }}
                >
                  Publier
                </button>
              </div>

              <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
                {posts.map((p) => (
                  <div key={p.id} style={{ border: "1px solid #eee", borderRadius: 12, padding: 10 }}>
                    <div style={{ fontSize: 12, opacity: 0.8 }}>{new Date(p.created_at).toLocaleString()}</div>
                    <div style={{ marginTop: 6 }}>{p.content}</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
'@

# Social Pages UI
Write-UTF8 (Join-Path $Root "src\pages\social\pages\index.tsx") @'
import React, { useEffect, useState } from "react";
import { addPagePost, createPage, listPagePosts, listPages } from "../../../lib/socialPlusService";

export default function PagesPage() {
  const [items, setItems] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  async function refresh() { setItems(await listPages()); }
  async function openPage(p: any) { setSelected(p); setPosts(await listPagePosts(p.id)); }

  useEffect(() => { refresh().catch((e) => setMsg(String(e?.message || e))); }, []);

  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ fontSize: 22, fontWeight: 800 }}>Pages</h2>
      <p style={{ opacity: 0.8 }}>Création + posts (style “Page officielle”)</p>
      {msg ? <div style={{ color: "#0f766e", marginBottom: 10 }}>{msg}</div> : null}

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", margin: "10px 0" }}>
        <button
          onClick={async () => {
            setMsg(null);
            try {
              const p = await createPage({ name: "Page " + new Date().toISOString().slice(0,10), country: "TN" });
              setMsg("Page créée ✅");
              await refresh();
              await openPage(p);
            } catch (e: any) {
              setMsg(e?.message || String(e));
            }
          }}
          style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #ddd" }}
        >
          + Créer page
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: 12 }}>
        <div style={{ border: "1px solid #e5e5e5", borderRadius: 14, padding: 12 }}>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>Liste</div>
          {items.length === 0 ? (
            <div>Aucune page.</div>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              {items.map((p) => (
                <button key={p.id} onClick={() => openPage(p)} style={{ textAlign: "left", padding: 10, borderRadius: 12, border: "1px solid #eee", background: "white" }}>
                  <div style={{ fontWeight: 700 }}>{p.name}</div>
                  <div style={{ fontSize: 12, opacity: 0.8 }}>{p.country}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div style={{ border: "1px solid #e5e5e5", borderRadius: 14, padding: 12 }}>
          {!selected ? (
            <div>Sélectionne une page.</div>
          ) : (
            <>
              <div style={{ fontWeight: 900, fontSize: 18 }}>{selected.name}</div>
              <div style={{ fontSize: 12, opacity: 0.8 }}>Posts publics</div>

              <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
                <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Écrire un post..." style={{ flex: 1, padding: 10, borderRadius: 10, border: "1px solid #ddd" }} />
                <button
                  onClick={async () => {
                    if (!text.trim()) return;
                    const content = text.trim();
                    setText("");
                    await addPagePost(selected.id, content);
                    setPosts(await listPagePosts(selected.id));
                  }}
                  style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #ddd" }}
                >
                  Publier
                </button>
              </div>

              <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
                {posts.map((p) => (
                  <div key={p.id} style={{ border: "1px solid #eee", borderRadius: 12, padding: 10 }}>
                    <div style={{ fontSize: 12, opacity: 0.8 }}>{new Date(p.created_at).toLocaleString()}</div>
                    <div style={{ marginTop: 6 }}>{p.content}</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
'@

# ---------------------------
# 5) Patch Live WebRTC page: read query ?room=...&mode=audio/video and disable video track if audio
# ---------------------------
$livePath = Join-Path $Root "src\pages\live\index.tsx"
$live = Read-Text $livePath
if($live){
  if($live -notmatch "URLSearchParams"){
    $patch = @'
  const params = new URLSearchParams(window.location.search);
  const qRoom = params.get("room");
  const qMode = params.get("mode"); // audio|video
  React.useEffect(() => {
    if (qRoom) setRoomId(qRoom);
  }, [qRoom]);
'@
    # Inject just after roomId state declaration (best-effort)
    $live2 = $live -replace "const \[roomId, setRoomId\] = useState\(\"class-1\"\);", "const [roomId, setRoomId] = useState(""class-1"");`r`n$patch"
    # Modify getUserMedia to audio-only when mode=audio
    $live2 = $live2 -replace "getUserMedia\(\{ audio: true, video: true \}\)", "getUserMedia({ audio: true, video: qMode !== ""audio"" })"
    Write-UTF8 $livePath $live2
    Ok "Patched live page query params (room/mode)"
  } else {
    Ok "Live page already has URLSearchParams patch"
  }
} else {
  Warn "Live page not found, skipped"
}

# ---------------------------
# 6) Patch router.tsx to add routes
# ---------------------------
$routerPath = Join-Path $Root "src\router.tsx"
$router = Read-Text $routerPath
if(!$router){
  Warn "src/router.tsx not found. Skipping router patch."
} else {
  $r = $router

  # Ensure imports (best-effort)
  if($r -notmatch "from '\./pages/info/culture'"){
    $r = $r -replace "(?m)^(import\s+.+;?\s*)$", "`$1`r`nimport CulturePage from './pages/info/culture';"
  }
  if($r -notmatch "from '\./pages/info/sport'"){
    $r = $r -replace "(?m)^(import\s+.+;?\s*)$", "`$1`r`nimport SportPage from './pages/info/sport';"
  }
  if($r -notmatch "from '\./pages/info/politics'"){
    $r = $r -replace "(?m)^(import\s+.+;?\s*)$", "`$1`r`nimport PoliticsPage from './pages/info/politics';"
  }
  if($r -notmatch "from '\./pages/admin'"){
    $r = $r -replace "(?m)^(import\s+.+;?\s*)$", "`$1`r`nimport AdminPage from './pages/admin';"
  }
  if($r -notmatch "from '\./pages/notifications'"){
    $r = $r -replace "(?m)^(import\s+.+;?\s*)$", "`$1`r`nimport NotificationsPage from './pages/notifications';"
  }
  if($r -notmatch "from '\./pages/social/groups'"){
    $r = $r -replace "(?m)^(import\s+.+;?\s*)$", "`$1`r`nimport GroupsPage from './pages/social/groups';"
  }
  if($r -notmatch "from '\./pages/social/pages'"){
    $r = $r -replace "(?m)^(import\s+.+;?\s*)$", "`$1`r`nimport PagesPage from './pages/social/pages';"
  }

  # Add routes if missing (append into routes list, best-effort)
  if($r -notmatch 'path:\s*"/info/culture"'){
    $r = $r -replace "\]\s*\)\s*;","  ,{ path: '/info/culture', element: <CulturePage /> }`r`n  ,{ path: '/info/sport', element: <SportPage /> }`r`n  ,{ path: '/info/politics', element: <PoliticsPage /> }`r`n  ,{ path: '/admin', element: <AdminPage /> }`r`n  ,{ path: '/notifications', element: <NotificationsPage /> }`r`n  ,{ path: '/social/groups', element: <GroupsPage /> }`r`n  ,{ path: '/social/pages', element: <PagesPage /> }`r`n]) ;"
  }

  Write-UTF8 $routerPath $r
}

# ---------------------------
# 7) Docs next steps
# ---------------------------
Write-UTF8 (Join-Path $Root "docs\INFO_ADMIN_NOTIFY_SOCIALPLUS_NEXT_STEPS.md") @'
# DONIA — Pack Info + Admin + Notifications + Social+

## 1) Supabase (2 minutes)
SQL Editor → RUN:
docs/sql/info_admin_notifications_socialplus.sql

## 2) Run local
npm run dev

Open:
- /info/culture
- /info/sport
- /info/politics
- /admin   (admin only; add items with attribution then publish)
- /notifications
- /social/groups  (group + posts + audio/video call buttons)
- /social/pages   (pages + posts)

## 3) WebRTC calls
Buttons open: /live?room=group-<id>&mode=audio|video
Requires signaling server at VITE_SIGNALING_URL (Socket.IO)
'@

Ok "DONE ✅ Pack Culture+Sport+Politics + Admin + Notifications + Groups/Pages + Call buttons generated"
Write-Host "NEXT: Run Supabase SQL file then: npm run dev" -ForegroundColor Yellow
