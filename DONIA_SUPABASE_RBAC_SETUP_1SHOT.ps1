param(
  [string]$Root = "C:\lovable\doniasocial"
)

$ErrorActionPreference = "Stop"
function Info($m){ Write-Host "[INFO] $m" -ForegroundColor Cyan }
function Ok($m){ Write-Host "[OK]  $m" -ForegroundColor Green }
function Die($m){ Write-Host "[ERR] $m" -ForegroundColor Red; throw $m }

if(!(Test-Path -LiteralPath $Root)){ Die "Root not found: $Root" }
Set-Location $Root

# safe write helper (no Set-Content -Encoding)
function Write-TextFile([string]$Path,[string]$Content){
  $dir = Split-Path -Parent $Path
  if($dir -and !(Test-Path -LiteralPath $dir)){
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
  }
  [System.IO.File]::WriteAllText($Path, $Content, [System.Text.Encoding]::UTF8)
  Ok "WRITE $Path"
}

# --- SQL: RBAC + core tables + RLS policies
$sqlPath = Join-Path $Root "docs\sql\supabase_rbac_core.sql"

$sql = @'
-- DONIA / Supabase Cloud / RBAC Core (RLS-ready)
-- Run in Supabase SQL Editor (Project -> SQL Editor -> New query -> Run)

-- Extensions (safe if already enabled)
create extension if not exists pgcrypto;
create extension if not exists "uuid-ossp";

-- 1) PROFILES
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  country text,
  locale text default 'fr',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- updated_at trigger
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- 2) RBAC: roles + user_roles
create table if not exists public.roles (
  id bigserial primary key,
  name text not null unique,        -- admin, teacher, student, parent, doctor, patient, moderator
  description text
);

create table if not exists public.user_roles (
  user_id uuid not null references auth.users(id) on delete cascade,
  role_id bigint not null references public.roles(id) on delete cascade,
  granted_by uuid null references auth.users(id),
  created_at timestamptz not null default now(),
  primary key (user_id, role_id)
);

-- Seed roles (idempotent)
insert into public.roles(name, description) values
  ('admin','Platform administrator'),
  ('teacher','Teacher / educator'),
  ('student','Student'),
  ('parent','Parent / guardian'),
  ('doctor','Healthcare professional'),
  ('patient','Patient'),
  ('moderator','Content moderator')
on conflict (name) do nothing;

-- 3) RBAC helper: has_role(role_name)
-- SECURITY DEFINER to allow role checks under RLS.
create or replace function public.has_role(role_name text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.user_id = auth.uid()
      and r.name = role_name
  );
$$;

-- 4) Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles(id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name',''))
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- 5) NOTIFICATIONS (cross-modules)
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  module text not null,            -- social, education, medical, courses, admin, etc.
  type text not null,              -- info, warning, action, system
  title text not null,
  body text,
  data jsonb not null default '{}'::jsonb,
  read_at timestamptz null,
  created_at timestamptz not null default now()
);

create index if not exists idx_notifications_user_created on public.notifications(user_id, created_at desc);

-- 6) AUDIT LOG (immutable-ish)
create table if not exists public.audit_log (
  id bigserial primary key,
  actor_id uuid null references auth.users(id),
  module text not null,
  action text not null,
  entity_type text,
  entity_id text,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_auditlog_module_created on public.audit_log(module, created_at desc);
create index if not exists idx_auditlog_actor_created on public.audit_log(actor_id, created_at desc);

-- 7) SOCIAL CORE
create table if not exists public.relationships (
  user_id uuid not null references auth.users(id) on delete cascade,
  friend_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'accepted', -- pending/accepted/blocked
  created_at timestamptz not null default now(),
  primary key (user_id, friend_id)
);

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'chat', -- chat, audio, video
  name text,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.room_members (
  room_id uuid not null references public.rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member', -- owner, member
  created_at timestamptz not null default now(),
  primary key (room_id, user_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  type text not null default 'text', -- text, audio, video, signal
  content text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_messages_room_created on public.messages(room_id, created_at desc);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users(id) on delete cascade,
  visibility text not null default 'friends', -- public/friends/private
  content text,
  media jsonb not null default '[]'::jsonb, -- [{url,type,credit}]
  created_at timestamptz not null default now()
);

create index if not exists idx_posts_created on public.posts(created_at desc);
create index if not exists idx_posts_author_created on public.posts(author_id, created_at desc);

-- 8) E-LEARNING CORE
create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  cycle text not null,      -- primaire/secondaire/universitÃ©
  level text,
  category text,
  lang text default 'fr',
  price numeric(10,2) default 0,
  currency text default 'TND',
  billing_model text default 'one_time', -- one_time/subscription/bundle
  mode text default 'replay',            -- live/replay/hybrid
  description text,
  status text not null default 'draft',  -- draft/published/archived
  tags text[] default '{}'::text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_courses_updated_at on public.courses;
create trigger trg_courses_updated_at
before update on public.courses
for each row execute function public.set_updated_at();

create index if not exists idx_courses_status_created on public.courses(status, created_at desc);
create index if not exists idx_courses_teacher_created on public.courses(teacher_id, created_at desc);

create table if not exists public.enrollments (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  student_id uuid not null references auth.users(id) on delete cascade,
  payment_status text not null default 'pending', -- pending/paid/failed/refunded
  paid_at timestamptz null,
  created_at timestamptz not null default now(),
  unique (course_id, student_id)
);

create index if not exists idx_enrollments_student_created on public.enrollments(student_id, created_at desc);
create index if not exists idx_enrollments_course_created on public.enrollments(course_id, created_at desc);

-- =========================
-- RLS + POLICIES
-- =========================

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.roles enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_log enable row level security;

alter table public.relationships enable row level security;
alter table public.rooms enable row level security;
alter table public.room_members enable row level security;
alter table public.messages enable row level security;
alter table public.posts enable row level security;

alter table public.courses enable row level security;
alter table public.enrollments enable row level security;

-- PROFILES policies
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles for select
to authenticated
using (id = auth.uid() or public.has_role('admin'));

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles for update
to authenticated
using (id = auth.uid() or public.has_role('admin'))
with check (id = auth.uid() or public.has_role('admin'));

-- ROLES: readable by authenticated (or restrict later)
drop policy if exists "roles_select_all" on public.roles;
create policy "roles_select_all"
on public.roles for select
to authenticated
using (true);

-- USER_ROLES: only admin can manage; user can read own
drop policy if exists "user_roles_select_own_or_admin" on public.user_roles;
create policy "user_roles_select_own_or_admin"
on public.user_roles for select
to authenticated
using (user_id = auth.uid() or public.has_role('admin'));

drop policy if exists "user_roles_admin_all" on public.user_roles;
create policy "user_roles_admin_all"
on public.user_roles for all
to authenticated
using (public.has_role('admin'))
with check (public.has_role('admin'));

-- NOTIFICATIONS: user sees own; admin sees all
drop policy if exists "notifications_select_own_or_admin" on public.notifications;
create policy "notifications_select_own_or_admin"
on public.notifications for select
to authenticated
using (user_id = auth.uid() or public.has_role('admin'));

drop policy if exists "notifications_insert_admin_or_system" on public.notifications;
create policy "notifications_insert_admin_or_system"
on public.notifications for insert
to authenticated
with check (public.has_role('admin') or user_id = auth.uid());

drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own"
on public.notifications for update
to authenticated
using (user_id = auth.uid() or public.has_role('admin'))
with check (user_id = auth.uid() or public.has_role('admin'));

-- AUDIT LOG: admin only read; insert allowed for authenticated (append-only style)
drop policy if exists "audit_log_select_admin" on public.audit_log;
create policy "audit_log_select_admin"
on public.audit_log for select
to authenticated
using (public.has_role('admin'));

drop policy if exists "audit_log_insert_authenticated" on public.audit_log;
create policy "audit_log_insert_authenticated"
on public.audit_log for insert
to authenticated
with check (actor_id = auth.uid() or actor_id is null);

-- SOCIAL: relationships (simple)
drop policy if exists "relationships_select_own" on public.relationships;
create policy "relationships_select_own"
on public.relationships for select
to authenticated
using (user_id = auth.uid() or friend_id = auth.uid() or public.has_role('admin'));

drop policy if exists "relationships_insert_own" on public.relationships;
create policy "relationships_insert_own"
on public.relationships for insert
to authenticated
with check (user_id = auth.uid());

-- ROOMS: member-based
drop policy if exists "rooms_select_members" on public.rooms;
create policy "rooms_select_members"
on public.rooms for select
to authenticated
using (
  public.has_role('admin')
  or exists(select 1 from public.room_members rm where rm.room_id = rooms.id and rm.user_id = auth.uid())
);

drop policy if exists "rooms_insert_authenticated" on public.rooms;
create policy "rooms_insert_authenticated"
on public.rooms for insert
to authenticated
with check (created_by = auth.uid());

-- ROOM_MEMBERS: user sees own memberships; owner/admin manage
drop policy if exists "room_members_select_own_or_admin" on public.room_members;
create policy "room_members_select_own_or_admin"
on public.room_members for select
to authenticated
using (user_id = auth.uid() or public.has_role('admin'));

drop policy if exists "room_members_manage_owner_or_admin" on public.room_members;
create policy "room_members_manage_owner_or_admin"
on public.room_members for all
to authenticated
using (
  public.has_role('admin')
  or exists(select 1 from public.room_members rm where rm.room_id = room_members.room_id and rm.user_id = auth.uid() and rm.role = 'owner')
)
with check (
  public.has_role('admin')
  or exists(select 1 from public.room_members rm where rm.room_id = room_members.room_id and rm.user_id = auth.uid() and rm.role = 'owner')
);

-- MESSAGES: members only
drop policy if exists "messages_select_members" on public.messages;
create policy "messages_select_members"
on public.messages for select
to authenticated
using (
  public.has_role('admin')
  or exists(select 1 from public.room_members rm where rm.room_id = messages.room_id and rm.user_id = auth.uid())
);

drop policy if exists "messages_insert_members" on public.messages;
create policy "messages_insert_members"
on public.messages for insert
to authenticated
with check (
  sender_id = auth.uid()
  and exists(select 1 from public.room_members rm where rm.room_id = messages.room_id and rm.user_id = auth.uid())
);

-- POSTS: author can CRUD; friends visibility is app-side for now (MVP). Admin can read all.
drop policy if exists "posts_select_authenticated" on public.posts;
create policy "posts_select_authenticated"
on public.posts for select
to authenticated
using (public.has_role('admin') or author_id = auth.uid() or visibility <> 'private');

drop policy if exists "posts_insert_own" on public.posts;
create policy "posts_insert_own"
on public.posts for insert
to authenticated
with check (author_id = auth.uid());

drop policy if exists "posts_update_own" on public.posts;
create policy "posts_update_own"
on public.posts for update
to authenticated
using (author_id = auth.uid() or public.has_role('admin'))
with check (author_id = auth.uid() or public.has_role('admin'));

drop policy if exists "posts_delete_own" on public.posts;
create policy "posts_delete_own"
on public.posts for delete
to authenticated
using (author_id = auth.uid() or public.has_role('admin'));

-- COURSES: teachers manage own; public can read published; admin all
drop policy if exists "courses_select_public_published" on public.courses;
create policy "courses_select_public_published"
on public.courses for select
to authenticated
using (
  status = 'published'
  or teacher_id = auth.uid()
  or public.has_role('admin')
);

drop policy if exists "courses_insert_teacher_or_admin" on public.courses;
create policy "courses_insert_teacher_or_admin"
on public.courses for insert
to authenticated
with check (teacher_id = auth.uid() or public.has_role('admin'));

drop policy if exists "courses_update_teacher_or_admin" on public.courses;
create policy "courses_update_teacher_or_admin"
on public.courses for update
to authenticated
using (teacher_id = auth.uid() or public.has_role('admin'))
with check (teacher_id = auth.uid() or public.has_role('admin'));

-- ENROLLMENTS: student sees own; teacher sees enrollments of own courses; admin all
drop policy if exists "enrollments_select_student_teacher_admin" on public.enrollments;
create policy "enrollments_select_student_teacher_admin"
on public.enrollments for select
to authenticated
using (
  student_id = auth.uid()
  or public.has_role('admin')
  or exists(select 1 from public.courses c where c.id = enrollments.course_id and c.teacher_id = auth.uid())
);

drop policy if exists "enrollments_insert_student" on public.enrollments;
create policy "enrollments_insert_student"
on public.enrollments for insert
to authenticated
with check (student_id = auth.uid());

drop policy if exists "enrollments_update_student_or_teacher_or_admin" on public.enrollments;
create policy "enrollments_update_student_or_teacher_or_admin"
on public.enrollments for update
to authenticated
using (
  student_id = auth.uid()
  or public.has_role('admin')
  or exists(select 1 from public.courses c where c.id = enrollments.course_id and c.teacher_id = auth.uid())
)
with check (
  student_id = auth.uid()
  or public.has_role('admin')
  or exists(select 1 from public.courses c where c.id = enrollments.course_id and c.teacher_id = auth.uid())
);

-- Done
'@

Write-TextFile $sqlPath $sql

# Guide markdown
$mdPath = Join-Path $Root "docs\SUPABASE_APPLY_RBAC.md"

