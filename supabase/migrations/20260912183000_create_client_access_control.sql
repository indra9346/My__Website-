-- Personal portfolio: central client-site ownership and access control.
-- This control plane is managed only by the portfolio's primary admin.

create extension if not exists "pgcrypto";

create table if not exists public.client_sites (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  slug text not null unique,
  site_url text not null,
  api_base_url text,
  status text not null default 'active' check (status in ('active', 'paused', 'archived')),
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.client_site_access (
  id uuid primary key default gen_random_uuid(),
  client_site_id uuid not null references public.client_sites(id) on delete cascade,
  full_name text not null,
  phone text not null,
  email text not null,
  role text not null default 'site_owner' check (role in ('site_owner', 'co_owner', 'editor', 'viewer')),
  permissions jsonb not null default '[]'::jsonb,
  project_scope jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (client_site_id, email)
);

create index if not exists client_site_access_site_active_idx on public.client_site_access(client_site_id, is_active);

create or replace function public.is_control_plane_admin()
returns boolean language sql stable security definer set search_path = public
as $$ select coalesce((auth.jwt() ->> 'email') = 'ik9893344@gmail.com', false); $$;

alter table public.client_sites enable row level security;
alter table public.client_site_access enable row level security;

create policy "primary admin manages client sites" on public.client_sites
  for all to authenticated using (public.is_control_plane_admin()) with check (public.is_control_plane_admin());
create policy "primary admin manages client access" on public.client_site_access
  for all to authenticated using (public.is_control_plane_admin()) with check (public.is_control_plane_admin());

insert into public.client_sites (display_name, slug, site_url, api_base_url, status, notes)
values ('KBK Film Studios', 'kbk-film-studios', 'https://kbk-film-studios-lake.vercel.app/', 'https://kbk-film-studios-lake.vercel.app/api', 'active', 'Wedding-film studio client site managed from Indra Portfolio.')
on conflict (slug) do update set site_url = excluded.site_url, api_base_url = excluded.api_base_url, updated_at = now();
