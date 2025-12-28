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