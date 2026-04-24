
-- Comments table (public posting, anyone can read; only authenticated users post)
create table public.comments (
  id uuid primary key default gen_random_uuid(),
  author_name text not null check (length(author_name) between 1 and 80),
  message text not null check (length(message) between 1 and 1000),
  created_at timestamptz not null default now()
);
alter table public.comments enable row level security;

-- Anyone can read comments (public guestbook)
create policy "comments_read_all"
  on public.comments for select
  using (true);

-- Anyone (anon or authenticated) can insert; rate limited via length checks
create policy "comments_insert_any"
  on public.comments for insert
  with check (
    length(author_name) between 1 and 80
    and length(message) between 1 and 1000
  );

create index comments_created_at_idx on public.comments (created_at desc);

-- Site settings: a single-row table for editable resume/site data
create table public.site_settings (
  id text primary key default 'singleton',
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint singleton_only check (id = 'singleton')
);
alter table public.site_settings enable row level security;

-- Anyone can read settings (it's the public site content)
create policy "settings_read_all"
  on public.site_settings for select
  using (true);

-- Owner role table (so only admins can edit)
create type public.app_role as enum ('admin', 'user');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role public.app_role not null,
  unique (user_id, role)
);
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  )
$$;

create policy "roles_read_self"
  on public.user_roles for select
  using (auth.uid() = user_id);

-- Only admins can edit settings
create policy "settings_update_admin"
  on public.site_settings for update
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

create policy "settings_insert_admin"
  on public.site_settings for insert
  with check (public.has_role(auth.uid(), 'admin'));

-- Only admins can delete comments
create policy "comments_delete_admin"
  on public.comments for delete
  using (public.has_role(auth.uid(), 'admin'));

-- Seed singleton row
insert into public.site_settings (id, data) values ('singleton', '{}'::jsonb)
  on conflict (id) do nothing;
