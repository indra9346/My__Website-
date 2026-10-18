-- =============================================================================
-- Client access control plane
-- =============================================================================
-- Register the client sites / ERPs you build and give each business its own
-- sign-in: an owner, co-owners, managers, staff and viewers, each with
-- per-module rights (none / view / edit) and, optionally, a list of projects.
-- Client sites call the public cp_* functions to sign people in and to check
-- sessions, so suspending someone in the portfolio admin signs them out of the
-- client site on its next check.
--
-- Platform admins (the developer) have full access to every site by default:
-- "Open as developer" from the admin panel, or a developer password.
--
-- Everything goes through the functions below; the tables are not readable or
-- writable through the API. This Supabase project is shared with other apps,
-- so the migration is additive and limited to client_* / cp_* objects. It
-- supersedes 20260912183000 (never applied) and is safe to run whether or not
-- that one ran, and safe to run again.
-- =============================================================================

create extension if not exists pgcrypto with schema extensions;

-- -----------------------------------------------------------------------------
-- Platform admins
-- -----------------------------------------------------------------------------
create table if not exists public.cp_platform_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  display_name text not null default '',
  password_hash text,
  failed_attempts integer not null default 0,
  locked_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- The portfolio owner's existing sign-in becomes the first platform admin.
insert into public.cp_platform_admins (user_id, email, display_name)
select u.id, lower(u.email), 'K S Indra Kumar'
from auth.users u
where lower(u.email) = 'ik9893344@gmail.com'
on conflict (user_id) do nothing;

create or replace function public.cp_is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.cp_platform_admins a where a.user_id = auth.uid());
$$;

-- Name used by the earlier client-access migration; kept for compatibility.
create or replace function public.is_control_plane_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.cp_is_platform_admin();
$$;

-- -----------------------------------------------------------------------------
-- Client sites
-- -----------------------------------------------------------------------------
create table if not exists public.client_sites (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  slug text not null unique,
  site_url text not null,
  api_base_url text,
  status text not null default 'active',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.client_sites
  add column if not exists business_name text not null default '',
  add column if not exists login_url text,
  add column if not exists modules jsonb not null default '[]'::jsonb,
  add column if not exists developer_access boolean not null default true,
  add column if not exists session_hours integer not null default 12;

alter table public.client_sites drop constraint if exists client_sites_status_check;
alter table public.client_sites add constraint client_sites_status_check check (status in ('active', 'paused', 'archived'));
alter table public.client_sites drop constraint if exists client_sites_slug_format;
alter table public.client_sites add constraint client_sites_slug_format check (slug ~ '^[a-z0-9][a-z0-9-]{1,47}$');
alter table public.client_sites drop constraint if exists client_sites_session_hours_range;
alter table public.client_sites add constraint client_sites_session_hours_range check (session_hours between 1 and 720);
alter table public.client_sites drop constraint if exists client_sites_modules_array;
alter table public.client_sites add constraint client_sites_modules_array check (jsonb_typeof(modules) = 'array');

-- -----------------------------------------------------------------------------
-- Members: who may sign in to a client site, and with what rights
-- -----------------------------------------------------------------------------
create table if not exists public.client_site_access (
  id uuid primary key default gen_random_uuid(),
  client_site_id uuid not null references public.client_sites (id) on delete cascade,
  full_name text not null,
  phone text not null default '',
  email text not null,
  role text not null default 'staff',
  permissions jsonb not null default '{}'::jsonb,
  project_scope jsonb not null default '["all"]'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (client_site_id, email)
);

alter table public.client_site_access
  add column if not exists status text not null default 'invited',
  add column if not exists password_hash text,
  add column if not exists must_change_password boolean not null default false,
  add column if not exists invite_token_hash text,
  add column if not exists invite_expires_at timestamptz,
  add column if not exists access_expires_at timestamptz,
  add column if not exists failed_attempts integer not null default 0,
  add column if not exists locked_until timestamptz,
  add column if not exists last_login_at timestamptz,
  add column if not exists notes text not null default '',
  add column if not exists created_by text;

alter table public.client_site_access alter column phone set default '';
alter table public.client_site_access alter column role set default 'staff';
alter table public.client_site_access alter column permissions set default '{}'::jsonb;
alter table public.client_site_access alter column project_scope set default '["all"]'::jsonb;

-- Bring rows from the earlier schema (if any) in line with this model:
-- site_owner/editor roles, and capability lists such as ["manage_bookings"].
alter table public.client_site_access drop constraint if exists client_site_access_role_check;
update public.client_site_access set role = 'owner' where role = 'site_owner';
update public.client_site_access set role = 'staff' where role = 'editor';
update public.client_site_access
  set permissions = coalesce((
    select jsonb_object_agg(regexp_replace(c.cap, '^manage_', ''), 'write')
    from jsonb_array_elements_text(permissions) as c(cap)
  ), '{}'::jsonb)
  where jsonb_typeof(permissions) = 'array';
update public.client_site_access set permissions = '{}'::jsonb where jsonb_typeof(permissions) <> 'object';
update public.client_site_access set project_scope = '["all"]'::jsonb
  where jsonb_typeof(project_scope) <> 'array' or project_scope = '[]'::jsonb;
update public.client_site_access set email = lower(trim(email)) where email <> lower(trim(email));

alter table public.client_site_access add constraint client_site_access_role_check
  check (role in ('owner', 'co_owner', 'manager', 'staff', 'viewer'));
alter table public.client_site_access drop constraint if exists client_site_access_status_check;
alter table public.client_site_access add constraint client_site_access_status_check
  check (status in ('invited', 'active', 'suspended', 'revoked'));
alter table public.client_site_access drop constraint if exists client_site_access_email_format;
alter table public.client_site_access add constraint client_site_access_email_format
  check (email = lower(email) and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$');
alter table public.client_site_access drop constraint if exists client_site_access_permissions_object;
alter table public.client_site_access add constraint client_site_access_permissions_object
  check (jsonb_typeof(permissions) = 'object');
alter table public.client_site_access drop constraint if exists client_site_access_scope_array;
alter table public.client_site_access add constraint client_site_access_scope_array
  check (jsonb_typeof(project_scope) = 'array');

-- Phone numbers are compared on their last 10 digits ("+91 93464 76951" = "9346476951").
create or replace function public.cp_phone_key(p_phone text)
returns text
language sql
immutable
set search_path = public
as $$
  select case
    when length(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g')) >= 7
      then right(regexp_replace(p_phone, '\D', '', 'g'), 10)
    else ''
  end;
$$;

drop index if exists public.client_site_access_site_active_idx;
-- One primary owner per site (co-owners are unlimited).
create unique index if not exists client_site_access_one_owner
  on public.client_site_access (client_site_id) where role = 'owner' and status <> 'revoked';
-- People can sign in with their phone number, so it must be unique within a site.
create unique index if not exists client_site_access_phone
  on public.client_site_access (client_site_id, public.cp_phone_key(phone))
  where public.cp_phone_key(phone) <> '' and status <> 'revoked';
create unique index if not exists client_site_access_invite_token
  on public.client_site_access (invite_token_hash) where invite_token_hash is not null;
create index if not exists client_site_access_site_status on public.client_site_access (client_site_id, status);

-- -----------------------------------------------------------------------------
-- Sessions, developer hand-offs, audit log
-- -----------------------------------------------------------------------------
create table if not exists public.cp_sessions (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  site_id uuid not null references public.client_sites (id) on delete cascade,
  member_id uuid references public.client_site_access (id) on delete cascade,
  admin_user_id uuid references public.cp_platform_admins (user_id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  last_seen_at timestamptz not null default now(),
  ip text,
  user_agent text,
  constraint cp_sessions_one_subject check ((member_id is null) <> (admin_user_id is null))
);
create index if not exists cp_sessions_site on public.cp_sessions (site_id);
create index if not exists cp_sessions_member on public.cp_sessions (member_id);
create index if not exists cp_sessions_admin on public.cp_sessions (admin_user_id);

create table if not exists public.cp_handoffs (
  token_hash text primary key,
  site_id uuid not null references public.client_sites (id) on delete cascade,
  admin_user_id uuid not null references public.cp_platform_admins (user_id) on delete cascade,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.cp_audit_log (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  site_id uuid references public.client_sites (id) on delete set null,
  member_id uuid references public.client_site_access (id) on delete set null,
  actor text not null,
  action text not null,
  detail jsonb not null default '{}'::jsonb,
  ip text
);
create index if not exists cp_audit_log_site_time on public.cp_audit_log (site_id, at desc);
create index if not exists cp_audit_log_failed_ip on public.cp_audit_log (ip, at desc) where action = 'login_failed';

-- -----------------------------------------------------------------------------
-- Internal helpers (not callable through the API)
-- -----------------------------------------------------------------------------
create or replace function public.cp_touch_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Random URL-safe token with a readable prefix (cps_ session, cpi_ invite, cph_ hand-off).
create or replace function public.cp_token(p_prefix text, p_bytes integer default 32)
returns text
language sql
volatile
set search_path = public, extensions
as $$
  select p_prefix || translate(rtrim(encode(extensions.gen_random_bytes(p_bytes), 'base64'), '='), '+/', '-_');
$$;

create or replace function public.cp_hash(p_value text)
returns text
language sql
immutable
set search_path = public, extensions
as $$
  select encode(extensions.digest(coalesce(p_value, ''), 'sha256'), 'hex');
$$;

create or replace function public.cp_request_header(p_name text)
returns text
language sql
stable
set search_path = public
as $$
  select coalesce(nullif(current_setting('request.headers', true), ''), '{}')::json ->> p_name;
$$;

create or replace function public.cp_request_ip()
returns text
language sql
stable
set search_path = public
as $$
  select nullif(trim(split_part(coalesce(public.cp_request_header('x-forwarded-for'), public.cp_request_header('cf-connecting-ip'), ''), ',', 1)), '');
$$;

-- Readable temporary password, e.g. "Kq7m-Xr3t-9Hnw" (no 0/O or 1/l/I).
create or replace function public.cp_temp_password()
returns text
language plpgsql
volatile
set search_path = public, extensions
as $$
declare
  v_alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  v_bytes bytea := extensions.gen_random_bytes(12);
  v_out text := '';
begin
  for i in 0..11 loop
    v_out := v_out || substr(v_alphabet, (get_byte(v_bytes, i) % length(v_alphabet)) + 1, 1);
  end loop;
  return substr(v_out, 1, 4) || '-' || substr(v_out, 5, 4) || '-' || substr(v_out, 9, 4);
end;
$$;

create or replace function public.cp_password_problem(p_password text, p_email text)
returns text
language sql
immutable
set search_path = public
as $$
  select case
    when p_password is null or length(p_password) < 8 then 'password_too_short'
    when length(p_password) > 128 then 'password_too_long'
    when lower(p_password) = lower(coalesce(p_email, '')) then 'password_matches_email'
    when lower(p_password) in ('password', 'password1', 'password123', '12345678', '123456789', '1234567890',
      'qwerty123', 'iloveyou', 'admin123', 'welcome1', 'welcome123', '11111111', '00000000') then 'password_too_common'
    else null
  end;
$$;

create or replace function public.cp_role_rank(p_role text)
returns integer
language sql
immutable
set search_path = public
as $$
  select case p_role
    when 'developer' then 9
    when 'owner' then 5
    when 'co_owner' then 4
    when 'manager' then 3
    when 'staff' then 2
    when 'viewer' then 1
    else 0
  end;
$$;

create or replace function public.cp_log(p_site uuid, p_member uuid, p_actor text, p_action text, p_detail jsonb default '{}'::jsonb)
returns void
language sql
volatile
security definer
set search_path = public
as $$
  insert into public.cp_audit_log (site_id, member_id, actor, action, detail, ip)
  values (p_site, p_member, coalesce(p_actor, 'system'), p_action, coalesce(p_detail, '{}'::jsonb), public.cp_request_ip());
$$;

create or replace function public.cp_actor_label()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce('developer:' || (select a.email from public.cp_platform_admins a where a.user_id = auth.uid()), 'system');
$$;

-- Keeps only modules the site defines. Owners and co-owners always have full
-- access; viewers are read-only.
create or replace function public.cp_normalize_permissions(p_site uuid, p_role text, p_permissions jsonb)
returns jsonb
language plpgsql
stable
set search_path = public
as $$
declare
  v_modules jsonb;
  v_key text;
  v_level text;
  v_out jsonb := '{}'::jsonb;
begin
  select coalesce(s.modules, '[]'::jsonb) into v_modules from public.client_sites s where s.id = p_site;
  for v_key in select e.m ->> 'key' from jsonb_array_elements(coalesce(v_modules, '[]'::jsonb)) as e(m) loop
    continue when v_key is null or v_key = '';
    if p_role in ('owner', 'co_owner', 'developer') then
      v_level := 'write';
    else
      v_level := coalesce(case when jsonb_typeof(p_permissions) = 'object' then p_permissions ->> v_key end, 'none');
      if v_level not in ('none', 'read', 'write') then
        v_level := 'none';
      end if;
      if p_role = 'viewer' and v_level = 'write' then
        v_level := 'read';
      end if;
    end if;
    if v_level <> 'none' then
      v_out := v_out || jsonb_build_object(v_key, v_level);
    end if;
  end loop;
  return v_out;
end;
$$;

-- ["all"], or the project ids / booking references someone is limited to.
create or replace function public.cp_normalize_scope(p_role text, p_scope jsonb)
returns jsonb
language sql
immutable
set search_path = public
as $$
  select case
    when p_role in ('owner', 'co_owner', 'developer') then '["all"]'::jsonb
    when p_scope is null or jsonb_typeof(p_scope) <> 'array' then '["all"]'::jsonb
    when exists (select 1 from jsonb_array_elements_text(p_scope) as e(v) where lower(trim(e.v)) = 'all') then '["all"]'::jsonb
    else coalesce((
      select jsonb_agg(distinct left(trim(e.v), 80))
      from jsonb_array_elements_text(p_scope) as e(v)
      where trim(e.v) <> ''
    ), '[]'::jsonb)
  end;
$$;

create or replace function public.cp_site_profile(p_site public.client_sites)
returns jsonb
language sql
stable
set search_path = public
as $$
  select jsonb_build_object(
    'slug', p_site.slug,
    'name', p_site.display_name,
    'business', p_site.business_name,
    'modules', p_site.modules
  );
$$;

create or replace function public.cp_member_profile(p_member public.client_site_access, p_site public.client_sites)
returns jsonb
language sql
stable
set search_path = public
as $$
  select jsonb_build_object(
    'id', p_member.id,
    'kind', 'member',
    'name', p_member.full_name,
    'email', p_member.email,
    'phone', p_member.phone,
    'role', p_member.role,
    'permissions', public.cp_normalize_permissions(p_site.id, p_member.role, p_member.permissions),
    'project_scope', public.cp_normalize_scope(p_member.role, p_member.project_scope),
    'can_manage_team', p_member.role in ('owner', 'co_owner'),
    'must_change_password', p_member.must_change_password,
    'access_expires_at', p_member.access_expires_at,
    'site', public.cp_site_profile(p_site)
  );
$$;

create or replace function public.cp_developer_profile(p_admin public.cp_platform_admins, p_site public.client_sites)
returns jsonb
language sql
stable
set search_path = public
as $$
  select jsonb_build_object(
    'id', p_admin.user_id,
    'kind', 'developer',
    'name', coalesce(nullif(p_admin.display_name, ''), p_admin.email),
    'email', p_admin.email,
    'phone', '',
    'role', 'developer',
    'permissions', public.cp_normalize_permissions(p_site.id, 'developer', '{}'::jsonb),
    'project_scope', '["all"]'::jsonb,
    'can_manage_team', true,
    'must_change_password', false,
    'access_expires_at', null,
    'site', public.cp_site_profile(p_site)
  );
$$;

create or replace function public.cp_start_session(p_site public.client_sites, p_member uuid, p_admin uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_token text := public.cp_token('cps_', 32);
  v_expires timestamptz := now() + make_interval(hours => p_site.session_hours);
begin
  insert into public.cp_sessions (token_hash, site_id, member_id, admin_user_id, expires_at, ip, user_agent)
  values (public.cp_hash(v_token), p_site.id, p_member, p_admin, v_expires, public.cp_request_ip(),
    left(coalesce(public.cp_request_header('user-agent'), ''), 300));
  delete from public.cp_sessions where site_id = p_site.id and expires_at < now() - interval '1 day';
  return jsonb_build_object('session_token', v_token, 'expires_at', v_expires);
end;
$$;

-- Adds ?param=token to a URL, keeping any existing query string and #fragment.
create or replace function public.cp_link(p_url text, p_param text, p_token text)
returns text
language sql
immutable
set search_path = public
as $$
  select split_part(p_url, '#', 1)
    || case when position('?' in split_part(p_url, '#', 1)) > 0 then '&' else '?' end
    || p_param || '=' || p_token
    || case when position('#' in p_url) > 0 then '#' || substr(p_url, position('#' in p_url) + 1) else '' end;
$$;

create or replace function public.cp_login_url(p_site public.client_sites)
returns text
language sql
immutable
set search_path = public
as $$
  select coalesce(nullif(trim(coalesce(p_site.login_url, '')), ''), p_site.site_url);
$$;

-- Issues fresh credentials: an invite link (they choose a password) or a
-- temporary password (they must change it at first sign-in). The secret is
-- returned once; only hashes are stored. Existing sessions are ended.
create or replace function public.cp_issue_credentials(p_member_id uuid, p_method text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, extensions
as $$
declare
  v_member public.client_site_access;
  v_site public.client_sites;
  v_secret text;
  v_expires timestamptz := now() + interval '7 days';
begin
  select * into v_member from public.client_site_access where id = p_member_id for update;
  select * into v_site from public.client_sites where id = v_member.client_site_id;
  delete from public.cp_sessions where member_id = p_member_id;

  if p_method = 'password' then
    v_secret := public.cp_temp_password();
    update public.client_site_access
      set password_hash = extensions.crypt(v_secret, extensions.gen_salt('bf', 10)),
          must_change_password = true,
          invite_token_hash = null,
          invite_expires_at = null,
          failed_attempts = 0,
          locked_until = null,
          status = case when status = 'suspended' then 'suspended' else 'active' end
      where id = p_member_id;
    return jsonb_build_object('method', 'password', 'temporary_password', v_secret, 'login_url', public.cp_login_url(v_site));
  end if;

  v_secret := public.cp_token('cpi_', 24);
  update public.client_site_access
    set invite_token_hash = public.cp_hash(v_secret),
        invite_expires_at = v_expires,
        password_hash = null,
        must_change_password = false,
        failed_attempts = 0,
        locked_until = null,
        status = case when status = 'suspended' then 'suspended' else 'invited' end
    where id = p_member_id;
  return jsonb_build_object(
    'method', 'invite',
    'invite_url', public.cp_link(public.cp_login_url(v_site), 'cp_invite', v_secret),
    'invite_expires_at', v_expires
  );
end;
$$;

-- Rules shared by the admin panel and by owners managing their own team.
create or replace function public.cp_create_member(
  p_site_id uuid,
  p_actor text,
  p_actor_role text,
  p_full_name text,
  p_email text,
  p_phone text,
  p_role text,
  p_permissions jsonb,
  p_project_scope jsonb,
  p_access_expires_at timestamptz,
  p_method text,
  p_notes text
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_site public.client_sites;
  v_existing public.client_site_access;
  v_email text := lower(trim(coalesce(p_email, '')));
  v_name text := trim(coalesce(p_full_name, ''));
  v_phone text := left(trim(coalesce(p_phone, '')), 32);
  v_member_id uuid;
  v_credentials jsonb;
begin
  select * into v_site from public.client_sites where id = p_site_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'site_not_found');
  end if;
  if v_site.status = 'archived' then
    return jsonb_build_object('ok', false, 'error', 'site_archived');
  end if;
  if v_name = '' or length(v_name) > 120 then
    return jsonb_build_object('ok', false, 'error', 'invalid_name');
  end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or length(v_email) > 254 then
    return jsonb_build_object('ok', false, 'error', 'invalid_email');
  end if;
  if v_phone <> '' and public.cp_phone_key(v_phone) = '' then
    return jsonb_build_object('ok', false, 'error', 'invalid_phone');
  end if;
  if public.cp_role_rank(p_role) = 0 or p_role = 'developer' then
    return jsonb_build_object('ok', false, 'error', 'invalid_role');
  end if;
  -- People can only add roles below their own (the developer can add owners).
  if p_actor_role <> 'developer' and public.cp_role_rank(p_role) >= public.cp_role_rank(p_actor_role) then
    return jsonb_build_object('ok', false, 'error', 'role_not_allowed');
  end if;
  if exists (select 1 from public.cp_platform_admins where email = v_email) then
    return jsonb_build_object('ok', false, 'error', 'email_is_developer');
  end if;
  select * into v_existing from public.client_site_access where client_site_id = p_site_id and email = v_email for update;
  if found and v_existing.status <> 'revoked' then
    return jsonb_build_object('ok', false, 'error', 'member_exists');
  end if;
  if p_role = 'owner' and exists (
    select 1 from public.client_site_access where client_site_id = p_site_id and role = 'owner' and status <> 'revoked'
  ) then
    return jsonb_build_object('ok', false, 'error', 'owner_exists');
  end if;
  if public.cp_phone_key(v_phone) <> '' and exists (
    select 1 from public.client_site_access
    where client_site_id = p_site_id and status <> 'revoked' and public.cp_phone_key(phone) = public.cp_phone_key(v_phone)
  ) then
    return jsonb_build_object('ok', false, 'error', 'phone_in_use');
  end if;
  if p_access_expires_at is not null and p_access_expires_at <= now() then
    return jsonb_build_object('ok', false, 'error', 'invalid_expiry');
  end if;

  if v_existing.id is not null then
    -- Someone whose access was revoked earlier comes back as a fresh member.
    update public.client_site_access set
      full_name = v_name,
      phone = v_phone,
      role = p_role,
      permissions = public.cp_normalize_permissions(p_site_id, p_role, p_permissions),
      project_scope = public.cp_normalize_scope(p_role, p_project_scope),
      status = 'invited',
      password_hash = null,
      access_expires_at = p_access_expires_at,
      last_login_at = null,
      notes = left(coalesce(p_notes, ''), 500),
      created_by = p_actor
    where id = v_existing.id
    returning id into v_member_id;
  else
    insert into public.client_site_access (client_site_id, full_name, email, phone, role, permissions, project_scope,
      status, access_expires_at, notes, created_by)
    values (
      p_site_id, v_name, v_email, v_phone, p_role,
      public.cp_normalize_permissions(p_site_id, p_role, p_permissions),
      public.cp_normalize_scope(p_role, p_project_scope),
      'invited', p_access_expires_at, left(coalesce(p_notes, ''), 500), p_actor
    )
    returning id into v_member_id;
  end if;

  v_credentials := public.cp_issue_credentials(v_member_id, case when p_method = 'password' then 'password' else 'invite' end);
  perform public.cp_log(p_site_id, v_member_id, p_actor, 'member_added',
    jsonb_build_object('email', v_email, 'role', p_role, 'method', v_credentials ->> 'method'));
  return jsonb_build_object('ok', true, 'member_id', v_member_id) || v_credentials;
end;
$$;

-- The developer manages anyone; owners and co-owners manage people below them.
create or replace function public.cp_can_manage(p_actor_role text, p_actor_member uuid, p_target public.client_site_access)
returns boolean
language sql
stable
set search_path = public
as $$
  select case
    when p_actor_role = 'developer' then true
    when p_actor_role not in ('owner', 'co_owner') then false
    when p_actor_member = p_target.id then false
    else public.cp_role_rank(p_target.role) < public.cp_role_rank(p_actor_role)
  end;
$$;

create or replace function public.cp_update_member(
  p_member_id uuid,
  p_actor text,
  p_actor_role text,
  p_actor_member uuid,
  p_full_name text,
  p_email text,
  p_phone text,
  p_role text,
  p_permissions jsonb,
  p_project_scope jsonb,
  p_access_expires_at timestamptz,
  p_clear_expiry boolean,
  p_notes text
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_member public.client_site_access;
  v_role text;
  v_email text;
  v_phone text;
begin
  select * into v_member from public.client_site_access where id = p_member_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'member_not_found');
  end if;
  if not public.cp_can_manage(p_actor_role, p_actor_member, v_member) then
    return jsonb_build_object('ok', false, 'error', 'not_allowed');
  end if;
  if v_member.status = 'revoked' then
    return jsonb_build_object('ok', false, 'error', 'member_revoked');
  end if;
  v_role := coalesce(nullif(p_role, ''), v_member.role);
  v_email := coalesce(nullif(lower(trim(coalesce(p_email, ''))), ''), v_member.email);
  v_phone := case when p_phone is null then v_member.phone else left(trim(p_phone), 32) end;
  if public.cp_role_rank(v_role) = 0 or v_role = 'developer' then
    return jsonb_build_object('ok', false, 'error', 'invalid_role');
  end if;
  if p_actor_role <> 'developer' and public.cp_role_rank(v_role) >= public.cp_role_rank(p_actor_role) then
    return jsonb_build_object('ok', false, 'error', 'role_not_allowed');
  end if;
  if v_role = 'owner' and exists (
    select 1 from public.client_site_access
    where client_site_id = v_member.client_site_id and role = 'owner' and status <> 'revoked' and id <> v_member.id
  ) then
    return jsonb_build_object('ok', false, 'error', 'owner_exists');
  end if;
  if v_email <> v_member.email then
    if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or length(v_email) > 254 then
      return jsonb_build_object('ok', false, 'error', 'invalid_email');
    end if;
    if exists (select 1 from public.cp_platform_admins where email = v_email) then
      return jsonb_build_object('ok', false, 'error', 'email_is_developer');
    end if;
    if exists (select 1 from public.client_site_access where client_site_id = v_member.client_site_id and email = v_email) then
      return jsonb_build_object('ok', false, 'error', 'member_exists');
    end if;
  end if;
  if v_phone <> '' and public.cp_phone_key(v_phone) = '' then
    return jsonb_build_object('ok', false, 'error', 'invalid_phone');
  end if;
  if public.cp_phone_key(v_phone) <> '' and exists (
    select 1 from public.client_site_access
    where client_site_id = v_member.client_site_id and status <> 'revoked' and id <> v_member.id
      and public.cp_phone_key(phone) = public.cp_phone_key(v_phone)
  ) then
    return jsonb_build_object('ok', false, 'error', 'phone_in_use');
  end if;
  if p_access_expires_at is not null and p_access_expires_at <= now() then
    return jsonb_build_object('ok', false, 'error', 'invalid_expiry');
  end if;

  update public.client_site_access set
    full_name = coalesce(nullif(left(trim(coalesce(p_full_name, '')), 120), ''), full_name),
    email = v_email,
    phone = v_phone,
    role = v_role,
    permissions = public.cp_normalize_permissions(client_site_id, v_role, coalesce(p_permissions, permissions)),
    project_scope = public.cp_normalize_scope(v_role, coalesce(p_project_scope, project_scope)),
    access_expires_at = case when coalesce(p_clear_expiry, false) then null else coalesce(p_access_expires_at, access_expires_at) end,
    notes = case when p_notes is null then notes else left(p_notes, 500) end
  where id = p_member_id;

  perform public.cp_log(v_member.client_site_id, p_member_id, p_actor, 'member_updated',
    jsonb_build_object('role', v_role) || case when v_role <> v_member.role then jsonb_build_object('previous_role', v_member.role) else '{}'::jsonb end);
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.cp_set_member_status(
  p_member_id uuid,
  p_actor text,
  p_actor_role text,
  p_actor_member uuid,
  p_status text
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_member public.client_site_access;
  v_status text := p_status;
begin
  if p_status not in ('active', 'suspended', 'revoked') then
    return jsonb_build_object('ok', false, 'error', 'invalid_status');
  end if;
  select * into v_member from public.client_site_access where id = p_member_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'member_not_found');
  end if;
  if not public.cp_can_manage(p_actor_role, p_actor_member, v_member) then
    return jsonb_build_object('ok', false, 'error', 'not_allowed');
  end if;
  if p_status = 'active' then
    if v_member.status = 'revoked' then
      return jsonb_build_object('ok', false, 'error', 'reissue_credentials');
    elsif v_member.password_hash is null then
      if v_member.status = 'suspended' and v_member.invite_token_hash is not null then
        v_status := 'invited'; -- un-suspended before accepting: the invite still stands
      elsif v_member.status = 'invited' then
        return jsonb_build_object('ok', false, 'error', 'invite_pending');
      else
        return jsonb_build_object('ok', false, 'error', 'reissue_credentials');
      end if;
    end if;
  end if;

  update public.client_site_access
    set status = v_status,
        invite_token_hash = case when v_status = 'revoked' then null else invite_token_hash end,
        invite_expires_at = case when v_status = 'revoked' then null else invite_expires_at end,
        password_hash = case when v_status = 'revoked' then null else password_hash end,
        failed_attempts = case when p_status = 'active' then 0 else failed_attempts end,
        locked_until = case when p_status = 'active' then null else locked_until end
    where id = p_member_id;
  if v_status in ('suspended', 'revoked') then
    delete from public.cp_sessions where member_id = p_member_id; -- signed out immediately
  end if;
  perform public.cp_log(v_member.client_site_id, p_member_id, p_actor,
    case p_status when 'active' then 'member_restored' when 'suspended' then 'member_suspended' else 'member_revoked' end, '{}'::jsonb);
  return jsonb_build_object('ok', true, 'status', v_status);
end;
$$;

-- -----------------------------------------------------------------------------
-- Triggers
-- -----------------------------------------------------------------------------
drop trigger if exists cp_platform_admins_touch on public.cp_platform_admins;
create trigger cp_platform_admins_touch before update on public.cp_platform_admins
  for each row execute function public.cp_touch_updated_at();
drop trigger if exists client_sites_touch on public.client_sites;
create trigger client_sites_touch before update on public.client_sites
  for each row execute function public.cp_touch_updated_at();
drop trigger if exists client_site_access_touch on public.client_site_access;
create trigger client_site_access_touch before update on public.client_site_access
  for each row execute function public.cp_touch_updated_at();

create or replace function public.cp_member_sync()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.is_active := new.status = 'active';
  return new;
end;
$$;
drop trigger if exists client_site_access_sync on public.client_site_access;
create trigger client_site_access_sync before insert or update on public.client_site_access
  for each row execute function public.cp_member_sync();
update public.client_site_access set is_active = (status = 'active') where is_active is distinct from (status = 'active');

-- Also applies to edits made in the Supabase dashboard: pausing or archiving a
-- site signs everyone out of it, and only archived sites can be deleted.
create or replace function public.cp_site_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    if old.status <> 'archived' then
      raise exception 'Archive the site before deleting it.' using errcode = 'P0001';
    end if;
    return old;
  end if;
  new.slug := lower(trim(new.slug));
  if tg_op = 'UPDATE' and new.status <> 'active' and old.status = 'active' then
    delete from public.cp_sessions where site_id = new.id;
  end if;
  return new;
end;
$$;
drop trigger if exists client_sites_guard on public.client_sites;
create trigger client_sites_guard before insert or update or delete on public.client_sites
  for each row execute function public.cp_site_guard();

-- -----------------------------------------------------------------------------
-- Admin panel API (platform admins only)
-- -----------------------------------------------------------------------------
create or replace function public.cp_admin_me()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select case when a.user_id is null then jsonb_build_object('is_admin', false)
    else jsonb_build_object('is_admin', true, 'email', a.email, 'name', a.display_name, 'has_developer_password', a.password_hash is not null)
  end
  from (select 1) as one
  left join public.cp_platform_admins a on a.user_id = auth.uid();
$$;

create or replace function public.cp_admin_site_json(p_site public.client_sites)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'id', p_site.id,
    'display_name', p_site.display_name,
    'business_name', p_site.business_name,
    'slug', p_site.slug,
    'site_url', p_site.site_url,
    'login_url', p_site.login_url,
    'api_base_url', p_site.api_base_url,
    'status', p_site.status,
    'notes', p_site.notes,
    'modules', p_site.modules,
    'developer_access', p_site.developer_access,
    'session_hours', p_site.session_hours,
    'created_at', p_site.created_at,
    'updated_at', p_site.updated_at,
    'members_total', (select count(*) from public.client_site_access m where m.client_site_id = p_site.id and m.status <> 'revoked'),
    'members_active', (select count(*) from public.client_site_access m where m.client_site_id = p_site.id and m.status = 'active'),
    'members_invited', (select count(*) from public.client_site_access m where m.client_site_id = p_site.id and m.status = 'invited'),
    'members_suspended', (select count(*) from public.client_site_access m where m.client_site_id = p_site.id and m.status = 'suspended'),
    'has_owner', exists (select 1 from public.client_site_access m where m.client_site_id = p_site.id and m.role = 'owner' and m.status <> 'revoked'),
    'sessions_active', (select count(*) from public.cp_sessions s where s.site_id = p_site.id and s.expires_at > now()),
    'last_login_at', (select max(m.last_login_at) from public.client_site_access m where m.client_site_id = p_site.id)
  );
$$;

create or replace function public.cp_admin_overview()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.cp_is_platform_admin() then
    return jsonb_build_object('ok', false, 'error', 'not_authorized');
  end if;
  return jsonb_build_object(
    'ok', true,
    'me', public.cp_admin_me(),
    'sites', coalesce((
      select jsonb_agg(public.cp_admin_site_json(s) order by s.status = 'archived', lower(s.display_name))
      from public.client_sites s
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.cp_admin_site_detail(p_site_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_site public.client_sites;
begin
  if not public.cp_is_platform_admin() then
    return jsonb_build_object('ok', false, 'error', 'not_authorized');
  end if;
  select * into v_site from public.client_sites where id = p_site_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'site_not_found');
  end if;
  return jsonb_build_object(
    'ok', true,
    'site', public.cp_admin_site_json(v_site),
    'members', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', m.id,
        'full_name', m.full_name,
        'email', m.email,
        'phone', m.phone,
        'role', m.role,
        'permissions', public.cp_normalize_permissions(v_site.id, m.role, m.permissions),
        'project_scope', public.cp_normalize_scope(m.role, m.project_scope),
        'status', m.status,
        'invite_pending', m.status = 'invited' and m.invite_token_hash is not null,
        'invite_expires_at', m.invite_expires_at,
        'must_change_password', m.must_change_password,
        'access_expires_at', m.access_expires_at,
        'locked_until', case when m.locked_until > now() then m.locked_until end,
        'last_login_at', m.last_login_at,
        'notes', m.notes,
        'created_by', m.created_by,
        'created_at', m.created_at,
        'sessions_active', (select count(*) from public.cp_sessions s where s.member_id = m.id and s.expires_at > now())
      ) order by m.status = 'revoked', public.cp_role_rank(m.role) desc, lower(m.full_name))
      from public.client_site_access m
      where m.client_site_id = v_site.id
    ), '[]'::jsonb),
    'activity', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', l.id, 'at', l.at, 'actor', l.actor, 'action', l.action, 'detail', l.detail, 'ip', l.ip,
        'member_name', (select m.full_name from public.client_site_access m where m.id = l.member_id)
      ) order by l.at desc, l.id desc)
      from (select * from public.cp_audit_log where site_id = v_site.id order by at desc, id desc limit 80) l
    ), '[]'::jsonb)
  );
end;
$$;

-- Create (no id) or update a site. Modules: [{"key": "bookings", "label": "Bookings"}, ...]
create or replace function public.cp_admin_save_site(p_site jsonb)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_existing public.client_sites;
  v_name text := trim(coalesce(p_site ->> 'display_name', ''));
  v_business text := left(trim(coalesce(p_site ->> 'business_name', '')), 160);
  v_slug text := lower(trim(coalesce(p_site ->> 'slug', '')));
  v_site_url text := trim(coalesce(p_site ->> 'site_url', ''));
  v_login_url text := nullif(trim(coalesce(p_site ->> 'login_url', '')), '');
  v_api_url text := nullif(trim(coalesce(p_site ->> 'api_base_url', '')), '');
  v_status text := coalesce(nullif(p_site ->> 'status', ''), 'active');
  v_notes text := left(coalesce(p_site ->> 'notes', ''), 2000);
  v_dev boolean := coalesce((p_site ->> 'developer_access')::boolean, true);
  v_hours integer;
  v_modules jsonb := '[]'::jsonb;
  v_module jsonb;
  v_key text;
  v_label text;
  v_saved public.client_sites;
  c_url constant text := '^https?://[^\s/?#]+[^\s]*$';
begin
  if not public.cp_is_platform_admin() then
    return jsonb_build_object('ok', false, 'error', 'not_authorized');
  end if;
  begin
    v_id := nullif(p_site ->> 'id', '')::uuid;
    v_hours := coalesce(nullif(p_site ->> 'session_hours', '')::integer, 12);
  exception when others then
    return jsonb_build_object('ok', false, 'error', 'invalid_input');
  end;
  if v_name = '' or length(v_name) > 120 then
    return jsonb_build_object('ok', false, 'error', 'invalid_name');
  end if;
  if v_site_url !~* c_url then
    return jsonb_build_object('ok', false, 'error', 'invalid_url', 'field', 'site_url');
  end if;
  if v_login_url is not null and v_login_url !~* c_url then
    return jsonb_build_object('ok', false, 'error', 'invalid_url', 'field', 'login_url');
  end if;
  if v_api_url is not null and v_api_url !~* c_url then
    return jsonb_build_object('ok', false, 'error', 'invalid_url', 'field', 'api_base_url');
  end if;
  if v_status not in ('active', 'paused', 'archived') then
    return jsonb_build_object('ok', false, 'error', 'invalid_status');
  end if;
  if v_hours not between 1 and 720 then
    return jsonb_build_object('ok', false, 'error', 'invalid_session_hours');
  end if;
  if jsonb_typeof(coalesce(p_site -> 'modules', '[]'::jsonb)) <> 'array' or jsonb_array_length(coalesce(p_site -> 'modules', '[]'::jsonb)) > 40 then
    return jsonb_build_object('ok', false, 'error', 'invalid_modules');
  end if;
  for v_module in select e.m from jsonb_array_elements(coalesce(p_site -> 'modules', '[]'::jsonb)) as e(m) loop
    v_key := lower(trim(coalesce(v_module ->> 'key', '')));
    v_label := left(trim(coalesce(v_module ->> 'label', '')), 40);
    if v_key !~ '^[a-z][a-z0-9_]{1,31}$' then
      return jsonb_build_object('ok', false, 'error', 'invalid_module_key', 'module', v_key);
    end if;
    if v_modules @> jsonb_build_array(jsonb_build_object('key', v_key)) then
      return jsonb_build_object('ok', false, 'error', 'duplicate_module', 'module', v_key);
    end if;
    if v_label = '' then
      v_label := initcap(replace(v_key, '_', ' '));
    end if;
    v_modules := v_modules || jsonb_build_array(jsonb_build_object('key', v_key, 'label', v_label));
  end loop;

  if v_id is null then
    if v_slug !~ '^[a-z0-9][a-z0-9-]{1,47}$' then
      return jsonb_build_object('ok', false, 'error', 'invalid_slug');
    end if;
    if exists (select 1 from public.client_sites where slug = v_slug) then
      return jsonb_build_object('ok', false, 'error', 'slug_taken');
    end if;
    insert into public.client_sites (display_name, business_name, slug, site_url, login_url, api_base_url, status, notes,
      modules, developer_access, session_hours)
    values (v_name, v_business, v_slug, v_site_url, v_login_url, v_api_url, v_status, v_notes, v_modules, v_dev, v_hours)
    returning * into v_saved;
    perform public.cp_log(v_saved.id, null, public.cp_actor_label(), 'site_created', jsonb_build_object('slug', v_slug));
  else
    select * into v_existing from public.client_sites where id = v_id for update;
    if not found then
      return jsonb_build_object('ok', false, 'error', 'site_not_found');
    end if;
    if v_slug <> '' and v_slug <> v_existing.slug then
      return jsonb_build_object('ok', false, 'error', 'slug_locked');
    end if;
    update public.client_sites set
      display_name = v_name, business_name = v_business, site_url = v_site_url, login_url = v_login_url,
      api_base_url = v_api_url, status = v_status, notes = v_notes, modules = v_modules,
      developer_access = v_dev, session_hours = v_hours
    where id = v_id
    returning * into v_saved;
    if not v_dev and v_existing.developer_access then
      delete from public.cp_sessions where site_id = v_id and admin_user_id is not null;
    end if;
    perform public.cp_log(v_id, null, public.cp_actor_label(),
      case when v_status <> v_existing.status then 'site_' || v_status else 'site_updated' end,
      jsonb_build_object('changed', (
        select coalesce(jsonb_agg(n.k order by n.k), '[]'::jsonb)
        from jsonb_each(to_jsonb(v_saved)) as n(k, v)
        where n.k <> 'updated_at' and n.v is distinct from (to_jsonb(v_existing) -> n.k)
      )));
  end if;
  return jsonb_build_object('ok', true, 'site', public.cp_admin_site_json(v_saved));
end;
$$;

create or replace function public.cp_admin_delete_site(p_site_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_site public.client_sites;
begin
  if not public.cp_is_platform_admin() then
    return jsonb_build_object('ok', false, 'error', 'not_authorized');
  end if;
  select * into v_site from public.client_sites where id = p_site_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'site_not_found');
  end if;
  if v_site.status <> 'archived' then
    return jsonb_build_object('ok', false, 'error', 'archive_first');
  end if;
  perform public.cp_log(null, null, public.cp_actor_label(), 'site_deleted',
    jsonb_build_object('slug', v_site.slug, 'name', v_site.display_name));
  delete from public.client_sites where id = p_site_id;
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.cp_admin_create_member(
  p_site_id uuid,
  p_full_name text,
  p_email text,
  p_phone text default '',
  p_role text default 'staff',
  p_permissions jsonb default '{}'::jsonb,
  p_project_scope jsonb default '["all"]'::jsonb,
  p_access_expires_at timestamptz default null,
  p_method text default 'invite',
  p_notes text default ''
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
begin
  if not public.cp_is_platform_admin() then
    return jsonb_build_object('ok', false, 'error', 'not_authorized');
  end if;
  return public.cp_create_member(p_site_id, public.cp_actor_label(), 'developer', p_full_name, p_email, p_phone, p_role,
    p_permissions, p_project_scope, p_access_expires_at, p_method, p_notes);
end;
$$;

create or replace function public.cp_admin_update_member(
  p_member_id uuid,
  p_full_name text default null,
  p_email text default null,
  p_phone text default null,
  p_role text default null,
  p_permissions jsonb default null,
  p_project_scope jsonb default null,
  p_access_expires_at timestamptz default null,
  p_clear_expiry boolean default false,
  p_notes text default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
begin
  if not public.cp_is_platform_admin() then
    return jsonb_build_object('ok', false, 'error', 'not_authorized');
  end if;
  return public.cp_update_member(p_member_id, public.cp_actor_label(), 'developer', null, p_full_name, p_email, p_phone,
    p_role, p_permissions, p_project_scope, p_access_expires_at, p_clear_expiry, p_notes);
end;
$$;

create or replace function public.cp_admin_set_member_status(p_member_id uuid, p_status text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
begin
  if not public.cp_is_platform_admin() then
    return jsonb_build_object('ok', false, 'error', 'not_authorized');
  end if;
  return public.cp_set_member_status(p_member_id, public.cp_actor_label(), 'developer', null, p_status);
end;
$$;

-- New invite link or temporary password (also how revoked people get access back).
create or replace function public.cp_admin_reset_member(p_member_id uuid, p_method text default 'invite')
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_member public.client_site_access;
  v_site public.client_sites;
  v_credentials jsonb;
begin
  if not public.cp_is_platform_admin() then
    return jsonb_build_object('ok', false, 'error', 'not_authorized');
  end if;
  select * into v_member from public.client_site_access where id = p_member_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'member_not_found');
  end if;
  select * into v_site from public.client_sites where id = v_member.client_site_id;
  if v_site.status = 'archived' then
    return jsonb_build_object('ok', false, 'error', 'site_archived');
  end if;
  if v_member.status = 'revoked' then
    if v_member.role = 'owner' and exists (
      select 1 from public.client_site_access
      where client_site_id = v_member.client_site_id and role = 'owner' and status <> 'revoked' and id <> v_member.id
    ) then
      return jsonb_build_object('ok', false, 'error', 'owner_exists');
    end if;
    if public.cp_phone_key(v_member.phone) <> '' and exists (
      select 1 from public.client_site_access
      where client_site_id = v_member.client_site_id and status <> 'revoked' and id <> v_member.id
        and public.cp_phone_key(phone) = public.cp_phone_key(v_member.phone)
    ) then
      return jsonb_build_object('ok', false, 'error', 'phone_in_use');
    end if;
  end if;
  v_credentials := public.cp_issue_credentials(p_member_id, case when p_method = 'password' then 'password' else 'invite' end);
  perform public.cp_log(v_member.client_site_id, p_member_id, public.cp_actor_label(), 'credentials_reset',
    jsonb_build_object('method', v_credentials ->> 'method'));
  return jsonb_build_object('ok', true, 'member_id', p_member_id) || v_credentials;
end;
$$;

-- Only for people who are revoked or never accepted their invite.
create or replace function public.cp_admin_delete_member(p_member_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_member public.client_site_access;
begin
  if not public.cp_is_platform_admin() then
    return jsonb_build_object('ok', false, 'error', 'not_authorized');
  end if;
  select * into v_member from public.client_site_access where id = p_member_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'member_not_found');
  end if;
  if v_member.status not in ('revoked', 'invited') then
    return jsonb_build_object('ok', false, 'error', 'revoke_first');
  end if;
  perform public.cp_log(v_member.client_site_id, null, public.cp_actor_label(), 'member_deleted',
    jsonb_build_object('email', v_member.email, 'name', v_member.full_name, 'role', v_member.role));
  delete from public.client_site_access where id = p_member_id;
  return jsonb_build_object('ok', true);
end;
$$;

-- One-time link that signs the developer in to a site ("Open as developer").
create or replace function public.cp_admin_issue_handoff(p_site_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_site public.client_sites;
  v_token text := public.cp_token('cph_', 32);
  v_expires timestamptz := now() + interval '2 minutes';
begin
  if not public.cp_is_platform_admin() then
    return jsonb_build_object('ok', false, 'error', 'not_authorized');
  end if;
  select * into v_site from public.client_sites where id = p_site_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'site_not_found');
  end if;
  if v_site.status <> 'active' then
    return jsonb_build_object('ok', false, 'error', 'site_unavailable');
  end if;
  if not v_site.developer_access then
    return jsonb_build_object('ok', false, 'error', 'developer_access_off');
  end if;
  delete from public.cp_handoffs where expires_at < now() - interval '1 day';
  insert into public.cp_handoffs (token_hash, site_id, admin_user_id, expires_at)
  values (public.cp_hash(v_token), p_site_id, auth.uid(), v_expires);
  perform public.cp_log(p_site_id, null, public.cp_actor_label(), 'developer_link_created', '{}'::jsonb);
  return jsonb_build_object('ok', true, 'url', public.cp_link(public.cp_login_url(v_site), 'cp_handoff', v_token), 'expires_at', v_expires);
end;
$$;

-- Lets the developer also sign in on any site's own login form.
create or replace function public.cp_admin_set_developer_password(p_password text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, extensions
as $$
declare
  v_admin public.cp_platform_admins;
  v_problem text;
begin
  select * into v_admin from public.cp_platform_admins where user_id = auth.uid();
  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_authorized');
  end if;
  v_problem := coalesce(public.cp_password_problem(p_password, v_admin.email),
    case when length(p_password) < 10 then 'password_too_short' end);
  if v_problem is not null then
    return jsonb_build_object('ok', false, 'error', v_problem);
  end if;
  update public.cp_platform_admins
    set password_hash = extensions.crypt(p_password, extensions.gen_salt('bf', 10)), failed_attempts = 0, locked_until = null
    where user_id = auth.uid();
  delete from public.cp_sessions where admin_user_id = auth.uid();
  perform public.cp_log(null, null, public.cp_actor_label(), 'developer_password_set', '{}'::jsonb);
  return jsonb_build_object('ok', true);
end;
$$;

-- Sign everyone (or one person) out of a site.
create or replace function public.cp_admin_end_sessions(p_site_id uuid, p_member_id uuid default null)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  if not public.cp_is_platform_admin() then
    return jsonb_build_object('ok', false, 'error', 'not_authorized');
  end if;
  delete from public.cp_sessions where site_id = p_site_id and (p_member_id is null or member_id = p_member_id);
  get diagnostics v_count = row_count;
  perform public.cp_log(p_site_id, p_member_id, public.cp_actor_label(), 'sessions_ended', jsonb_build_object('count', v_count));
  return jsonb_build_object('ok', true, 'ended', v_count);
end;
$$;

-- -----------------------------------------------------------------------------
-- Client-site API (called by the ERPs you build; the anon key is enough)
-- -----------------------------------------------------------------------------

-- Sign in with email (or phone) and password. Platform admins sign in to any
-- site with their developer password unless the site has developer access off.
-- Failed attempts: 5 per account then a 15 minute lock; 30 per IP per 15 minutes.
create or replace function public.cp_login(p_site text, p_identifier text, p_password text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, extensions
as $$
declare
  v_site public.client_sites;
  v_member public.client_site_access;
  v_admin public.cp_platform_admins;
  v_ident text := lower(trim(coalesce(p_identifier, '')));
  v_ip text := public.cp_request_ip();
  v_session jsonb;
begin
  select * into v_site from public.client_sites where slug = lower(trim(coalesce(p_site, '')));
  if not found or v_site.status <> 'active' then
    return jsonb_build_object('ok', false, 'error', 'site_unavailable');
  end if;
  if v_ip is not null and (
    select count(*) from public.cp_audit_log l where l.action = 'login_failed' and l.ip = v_ip and l.at > now() - interval '15 minutes'
  ) >= 30 then
    return jsonb_build_object('ok', false, 'error', 'too_many_attempts');
  end if;
  if v_ident = '' or coalesce(p_password, '') = '' then
    return jsonb_build_object('ok', false, 'error', 'invalid_credentials');
  end if;

  -- Developer (platform admin) access
  if position('@' in v_ident) > 0 then
    select * into v_admin from public.cp_platform_admins where email = v_ident;
    if found and v_site.developer_access then
      if v_admin.locked_until is not null and v_admin.locked_until > now() then
        return jsonb_build_object('ok', false, 'error', 'locked', 'retry_after_seconds', ceil(extract(epoch from v_admin.locked_until - now())));
      end if;
      if v_admin.password_hash is not null and extensions.crypt(p_password, v_admin.password_hash) = v_admin.password_hash then
        update public.cp_platform_admins set failed_attempts = 0, locked_until = null where user_id = v_admin.user_id;
        v_session := public.cp_start_session(v_site, null, v_admin.user_id);
        perform public.cp_log(v_site.id, null, 'developer:' || v_admin.email, 'developer_login', '{}'::jsonb);
        return jsonb_build_object('ok', true, 'profile', public.cp_developer_profile(v_admin, v_site)) || v_session;
      end if;
      if v_admin.password_hash is null then
        perform extensions.crypt(p_password, extensions.gen_salt('bf', 10));
      else
        update public.cp_platform_admins
          set failed_attempts = case when locked_until is not null and locked_until <= now() then 1 else failed_attempts + 1 end,
              locked_until = case
                when locked_until is not null and locked_until <= now() then null
                when failed_attempts + 1 >= 5 then now() + interval '15 minutes'
                else locked_until end
          where user_id = v_admin.user_id;
      end if;
      perform public.cp_log(v_site.id, null, 'developer:' || v_admin.email, 'login_failed', jsonb_build_object('identifier', v_ident));
      return jsonb_build_object('ok', false, 'error', 'invalid_credentials');
    end if;
    select * into v_member from public.client_site_access where client_site_id = v_site.id and email = v_ident;
  elsif public.cp_phone_key(v_ident) <> '' then
    select * into v_member from public.client_site_access
      where client_site_id = v_site.id and status <> 'revoked' and public.cp_phone_key(phone) = public.cp_phone_key(v_ident);
  end if;

  -- Members. Account state is only revealed once the password is right.
  if v_member.id is null or v_member.status = 'revoked' or v_member.password_hash is null then
    perform extensions.crypt(p_password, extensions.gen_salt('bf', 10)); -- same cost either way
    perform public.cp_log(v_site.id, v_member.id, 'member:' || v_ident, 'login_failed', jsonb_build_object('identifier', v_ident));
    return jsonb_build_object('ok', false, 'error', 'invalid_credentials');
  end if;
  if v_member.locked_until is not null and v_member.locked_until > now() then
    return jsonb_build_object('ok', false, 'error', 'locked', 'retry_after_seconds', ceil(extract(epoch from v_member.locked_until - now())));
  end if;
  if extensions.crypt(p_password, v_member.password_hash) <> v_member.password_hash then
    update public.client_site_access
      set failed_attempts = case when locked_until is not null and locked_until <= now() then 1 else failed_attempts + 1 end,
          locked_until = case
            when locked_until is not null and locked_until <= now() then null
            when failed_attempts + 1 >= 5 then now() + interval '15 minutes'
            else locked_until end
      where id = v_member.id;
    perform public.cp_log(v_site.id, v_member.id, 'member:' || v_member.email, 'login_failed', jsonb_build_object('identifier', v_ident));
    return jsonb_build_object('ok', false, 'error', 'invalid_credentials');
  end if;
  if v_member.status = 'suspended' then
    return jsonb_build_object('ok', false, 'error', 'suspended');
  end if;
  if v_member.access_expires_at is not null and v_member.access_expires_at < now() then
    return jsonb_build_object('ok', false, 'error', 'access_expired');
  end if;

  update public.client_site_access set failed_attempts = 0, locked_until = null, last_login_at = now() where id = v_member.id
    returning * into v_member;
  v_session := public.cp_start_session(v_site, v_member.id, null);
  perform public.cp_log(v_site.id, v_member.id, 'member:' || v_member.email, 'login', '{}'::jsonb);
  return jsonb_build_object('ok', true, 'profile', public.cp_member_profile(v_member, v_site)) || v_session;
end;
$$;

-- Check a session (on page load, and before private actions). Sessions end
-- after the site's idle time (session_hours) and at most 30 days after sign-in.
create or replace function public.cp_session(p_site text, p_token text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_session public.cp_sessions;
  v_site public.client_sites;
  v_member public.client_site_access;
  v_admin public.cp_platform_admins;
  v_profile jsonb;
  v_expires timestamptz;
begin
  select * into v_session from public.cp_sessions where token_hash = public.cp_hash(p_token);
  if not found or v_session.expires_at < now() then
    return jsonb_build_object('ok', false, 'error', 'session_expired');
  end if;
  select * into v_site from public.client_sites where id = v_session.site_id;
  if v_site.slug <> lower(trim(coalesce(p_site, ''))) then
    return jsonb_build_object('ok', false, 'error', 'session_invalid');
  end if;
  if v_site.status <> 'active' then
    delete from public.cp_sessions where id = v_session.id;
    return jsonb_build_object('ok', false, 'error', 'site_unavailable');
  end if;

  if v_session.admin_user_id is not null then
    select * into v_admin from public.cp_platform_admins where user_id = v_session.admin_user_id;
    if not found or not v_site.developer_access then
      delete from public.cp_sessions where id = v_session.id;
      return jsonb_build_object('ok', false, 'error', 'session_revoked');
    end if;
    v_profile := public.cp_developer_profile(v_admin, v_site);
  else
    select * into v_member from public.client_site_access where id = v_session.member_id;
    if not found or v_member.status <> 'active' or (v_member.access_expires_at is not null and v_member.access_expires_at < now()) then
      delete from public.cp_sessions where id = v_session.id;
      return jsonb_build_object('ok', false, 'error', 'session_revoked');
    end if;
    v_profile := public.cp_member_profile(v_member, v_site);
  end if;

  v_expires := v_session.expires_at;
  if v_session.last_seen_at < now() - interval '1 minute' then
    update public.cp_sessions
      set last_seen_at = now(),
          expires_at = least(created_at + interval '30 days', now() + make_interval(hours => v_site.session_hours))
      where id = v_session.id
      returning expires_at into v_expires;
  end if;
  return jsonb_build_object('ok', true, 'expires_at', v_expires, 'profile', v_profile);
end;
$$;

create or replace function public.cp_logout(p_token text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_session public.cp_sessions;
begin
  delete from public.cp_sessions where token_hash = public.cp_hash(p_token) returning * into v_session;
  if v_session.id is not null then
    perform public.cp_log(v_session.site_id, v_session.member_id,
      case when v_session.admin_user_id is not null then 'developer' else 'member' end, 'logout', '{}'::jsonb);
  end if;
  return jsonb_build_object('ok', true);
end;
$$;

-- Who an invite is for (shown on the "set your password" screen).
create or replace function public.cp_invite_info(p_site text, p_invite text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_site public.client_sites;
  v_member public.client_site_access;
begin
  select * into v_site from public.client_sites where slug = lower(trim(coalesce(p_site, '')));
  if not found or v_site.status <> 'active' then
    return jsonb_build_object('ok', false, 'error', 'site_unavailable');
  end if;
  select * into v_member from public.client_site_access
    where client_site_id = v_site.id and invite_token_hash = public.cp_hash(p_invite);
  if not found or v_member.status = 'revoked' then
    return jsonb_build_object('ok', false, 'error', 'invite_invalid');
  end if;
  if v_member.invite_expires_at < now() then
    return jsonb_build_object('ok', false, 'error', 'invite_expired');
  end if;
  if v_member.status = 'suspended' then
    return jsonb_build_object('ok', false, 'error', 'suspended');
  end if;
  return jsonb_build_object('ok', true, 'name', v_member.full_name, 'email', v_member.email, 'role', v_member.role,
    'expires_at', v_member.invite_expires_at, 'site', public.cp_site_profile(v_site));
end;
$$;

-- Accept an invite: choose a password and sign in.
create or replace function public.cp_redeem_invite(p_site text, p_invite text, p_new_password text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, extensions
as $$
declare
  v_info jsonb := public.cp_invite_info(p_site, p_invite);
  v_site public.client_sites;
  v_member public.client_site_access;
  v_problem text;
  v_session jsonb;
begin
  if not coalesce((v_info ->> 'ok')::boolean, false) then
    return v_info;
  end if;
  select * into v_site from public.client_sites where slug = lower(trim(p_site));
  select * into v_member from public.client_site_access
    where client_site_id = v_site.id and invite_token_hash = public.cp_hash(p_invite) for update;
  v_problem := public.cp_password_problem(p_new_password, v_member.email);
  if v_problem is not null then
    return jsonb_build_object('ok', false, 'error', v_problem);
  end if;

  update public.client_site_access
    set password_hash = extensions.crypt(p_new_password, extensions.gen_salt('bf', 10)),
        status = 'active',
        must_change_password = false,
        invite_token_hash = null,
        invite_expires_at = null,
        failed_attempts = 0,
        locked_until = null,
        last_login_at = now()
    where id = v_member.id
    returning * into v_member;
  if v_member.access_expires_at is not null and v_member.access_expires_at < now() then
    return jsonb_build_object('ok', false, 'error', 'access_expired');
  end if;
  v_session := public.cp_start_session(v_site, v_member.id, null);
  perform public.cp_log(v_site.id, v_member.id, 'member:' || v_member.email, 'invite_accepted', '{}'::jsonb);
  return jsonb_build_object('ok', true, 'profile', public.cp_member_profile(v_member, v_site)) || v_session;
end;
$$;

-- Change your own password (required after a temporary password). Other
-- devices are signed out.
create or replace function public.cp_change_password(p_site text, p_token text, p_current_password text, p_new_password text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, extensions
as $$
declare
  v_check jsonb := public.cp_session(p_site, p_token);
  v_session public.cp_sessions;
  v_site public.client_sites;
  v_member public.client_site_access;
  v_problem text;
begin
  if not coalesce((v_check ->> 'ok')::boolean, false) then
    return v_check;
  end if;
  select * into v_session from public.cp_sessions where token_hash = public.cp_hash(p_token);
  if v_session.member_id is null then
    return jsonb_build_object('ok', false, 'error', 'use_admin_panel');
  end if;
  select * into v_member from public.client_site_access where id = v_session.member_id for update;
  if extensions.crypt(coalesce(p_current_password, ''), v_member.password_hash) <> v_member.password_hash then
    return jsonb_build_object('ok', false, 'error', 'invalid_credentials');
  end if;
  v_problem := public.cp_password_problem(p_new_password, v_member.email);
  if v_problem is not null then
    return jsonb_build_object('ok', false, 'error', v_problem);
  end if;
  if p_new_password = p_current_password then
    return jsonb_build_object('ok', false, 'error', 'password_unchanged');
  end if;
  update public.client_site_access
    set password_hash = extensions.crypt(p_new_password, extensions.gen_salt('bf', 10)), must_change_password = false
    where id = v_member.id
    returning * into v_member;
  delete from public.cp_sessions where member_id = v_member.id and id <> v_session.id;
  select * into v_site from public.client_sites where id = v_session.site_id;
  perform public.cp_log(v_session.site_id, v_member.id, 'member:' || v_member.email, 'password_changed', '{}'::jsonb);
  return jsonb_build_object('ok', true, 'profile', public.cp_member_profile(v_member, v_site));
end;
$$;

-- Swap a one-time developer link for a session ("Open as developer").
create or replace function public.cp_exchange_handoff(p_site text, p_handoff text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_handoff public.cp_handoffs;
  v_site public.client_sites;
  v_admin public.cp_platform_admins;
  v_session jsonb;
begin
  select * into v_handoff from public.cp_handoffs where token_hash = public.cp_hash(p_handoff) for update;
  if not found or v_handoff.used_at is not null or v_handoff.expires_at < now() then
    return jsonb_build_object('ok', false, 'error', 'handoff_invalid');
  end if;
  select * into v_site from public.client_sites where id = v_handoff.site_id;
  if v_site.slug <> lower(trim(coalesce(p_site, ''))) or v_site.status <> 'active' or not v_site.developer_access then
    return jsonb_build_object('ok', false, 'error', 'handoff_invalid');
  end if;
  select * into v_admin from public.cp_platform_admins where user_id = v_handoff.admin_user_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'handoff_invalid');
  end if;
  update public.cp_handoffs set used_at = now() where token_hash = v_handoff.token_hash;
  v_session := public.cp_start_session(v_site, null, v_admin.user_id);
  perform public.cp_log(v_site.id, null, 'developer:' || v_admin.email, 'developer_login', jsonb_build_object('via', 'admin_panel'));
  return jsonb_build_object('ok', true, 'profile', public.cp_developer_profile(v_admin, v_site)) || v_session;
end;
$$;

-- For a client site's own row level security: true when the request carries an
-- "x-cp-session" header for a signed-in person with this right, e.g.
--   create policy staff_update on public.bookings for update
--     using ((select public.cp_can('my-site', 'bookings', 'write')));
create or replace function public.cp_can(p_site text, p_module text, p_level text default 'read')
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_token text := public.cp_request_header('x-cp-session');
  v_session public.cp_sessions;
  v_site public.client_sites;
  v_member public.client_site_access;
  v_level text;
begin
  if coalesce(v_token, '') = '' then
    return false;
  end if;
  select * into v_session from public.cp_sessions where token_hash = public.cp_hash(v_token) and expires_at > now();
  if not found then
    return false;
  end if;
  select * into v_site from public.client_sites
    where id = v_session.site_id and slug = lower(trim(coalesce(p_site, ''))) and status = 'active';
  if not found then
    return false;
  end if;
  if v_session.admin_user_id is not null then
    return v_site.developer_access and exists (select 1 from public.cp_platform_admins where user_id = v_session.admin_user_id);
  end if;
  select * into v_member from public.client_site_access
    where id = v_session.member_id and status = 'active' and not must_change_password
      and (access_expires_at is null or access_expires_at > now());
  if not found then
    return false;
  end if;
  v_level := public.cp_normalize_permissions(v_site.id, v_member.role, v_member.permissions) ->> p_module;
  return coalesce(case when p_level = 'write' then v_level = 'write' else v_level in ('read', 'write') end, false);
end;
$$;

-- The role behind the request's "x-cp-session" header ('developer', 'owner',
-- 'co_owner', 'manager', 'staff', 'viewer'), or null. For owner-only rows, e.g.
--   using ((select public.cp_session_role('my-site')) in ('owner', 'co_owner', 'developer'))
create or replace function public.cp_session_role(p_site text)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_token text := public.cp_request_header('x-cp-session');
  v_session public.cp_sessions;
  v_site public.client_sites;
  v_role text;
begin
  if coalesce(v_token, '') = '' then
    return null;
  end if;
  select * into v_session from public.cp_sessions where token_hash = public.cp_hash(v_token) and expires_at > now();
  if not found then
    return null;
  end if;
  select * into v_site from public.client_sites
    where id = v_session.site_id and slug = lower(trim(coalesce(p_site, ''))) and status = 'active';
  if not found then
    return null;
  end if;
  if v_session.admin_user_id is not null then
    return case when v_site.developer_access and exists (select 1 from public.cp_platform_admins where user_id = v_session.admin_user_id)
      then 'developer' end;
  end if;
  select m.role into v_role from public.client_site_access m
    where m.id = v_session.member_id and m.status = 'active' and not m.must_change_password
      and (m.access_expires_at is null or m.access_expires_at > now());
  return v_role;
end;
$$;

-- -----------------------------------------------------------------------------
-- Team management inside a client ERP (owners, co-owners and the developer)
-- -----------------------------------------------------------------------------
create or replace function public.cp_team_actor(p_site text, p_token text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_check jsonb := public.cp_session(p_site, p_token);
  v_role text;
begin
  if not coalesce((v_check ->> 'ok')::boolean, false) then
    return v_check;
  end if;
  v_role := v_check #>> '{profile,role}';
  if v_role not in ('owner', 'co_owner', 'developer') then
    return jsonb_build_object('ok', false, 'error', 'not_allowed');
  end if;
  if coalesce((v_check #>> '{profile,must_change_password}')::boolean, false) then
    return jsonb_build_object('ok', false, 'error', 'password_change_required');
  end if;
  return jsonb_build_object(
    'ok', true,
    'role', v_role,
    'member_id', case when v_role = 'developer' then null else v_check #>> '{profile,id}' end,
    'actor', case when v_role = 'developer' then 'developer:' else 'member:' end || (v_check #>> '{profile,email}'),
    'site_id', (select id from public.client_sites where slug = lower(trim(p_site)))
  );
end;
$$;

create or replace function public.cp_team_list(p_site text, p_token text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_actor jsonb := public.cp_team_actor(p_site, p_token);
begin
  if not coalesce((v_actor ->> 'ok')::boolean, false) then
    return v_actor;
  end if;
  return jsonb_build_object('ok', true, 'members', coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', m.id, 'name', m.full_name, 'email', m.email, 'phone', m.phone, 'role', m.role, 'status', m.status,
      'permissions', public.cp_normalize_permissions(m.client_site_id, m.role, m.permissions),
      'project_scope', public.cp_normalize_scope(m.role, m.project_scope),
      'access_expires_at', m.access_expires_at, 'last_login_at', m.last_login_at,
      'can_manage', public.cp_can_manage(v_actor ->> 'role', (v_actor ->> 'member_id')::uuid, m)
    ) order by public.cp_role_rank(m.role) desc, lower(m.full_name))
    from public.client_site_access m
    where m.client_site_id = (v_actor ->> 'site_id')::uuid and m.status <> 'revoked'
  ), '[]'::jsonb));
end;
$$;

create or replace function public.cp_team_invite(
  p_site text,
  p_token text,
  p_full_name text,
  p_email text,
  p_phone text default '',
  p_role text default 'staff',
  p_permissions jsonb default '{}'::jsonb,
  p_project_scope jsonb default '["all"]'::jsonb,
  p_access_expires_at timestamptz default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_actor jsonb := public.cp_team_actor(p_site, p_token);
begin
  if not coalesce((v_actor ->> 'ok')::boolean, false) then
    return v_actor;
  end if;
  return public.cp_create_member(
    (v_actor ->> 'site_id')::uuid, v_actor ->> 'actor', v_actor ->> 'role',
    p_full_name, p_email, p_phone, p_role, p_permissions, p_project_scope, p_access_expires_at, 'invite', ''
  );
end;
$$;

create or replace function public.cp_team_update(
  p_site text,
  p_token text,
  p_member_id uuid,
  p_role text default null,
  p_permissions jsonb default null,
  p_project_scope jsonb default null,
  p_access_expires_at timestamptz default null,
  p_clear_expiry boolean default false
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_actor jsonb := public.cp_team_actor(p_site, p_token);
begin
  if not coalesce((v_actor ->> 'ok')::boolean, false) then
    return v_actor;
  end if;
  if not exists (select 1 from public.client_site_access where id = p_member_id and client_site_id = (v_actor ->> 'site_id')::uuid) then
    return jsonb_build_object('ok', false, 'error', 'member_not_found');
  end if;
  return public.cp_update_member(
    p_member_id, v_actor ->> 'actor', v_actor ->> 'role', (v_actor ->> 'member_id')::uuid,
    null, null, null, p_role, p_permissions, p_project_scope, p_access_expires_at, p_clear_expiry, null
  );
end;
$$;

create or replace function public.cp_team_set_status(p_site text, p_token text, p_member_id uuid, p_status text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_actor jsonb := public.cp_team_actor(p_site, p_token);
begin
  if not coalesce((v_actor ->> 'ok')::boolean, false) then
    return v_actor;
  end if;
  if not exists (select 1 from public.client_site_access where id = p_member_id and client_site_id = (v_actor ->> 'site_id')::uuid) then
    return jsonb_build_object('ok', false, 'error', 'member_not_found');
  end if;
  return public.cp_set_member_status(p_member_id, v_actor ->> 'actor', v_actor ->> 'role', (v_actor ->> 'member_id')::uuid, p_status);
end;
$$;

-- A fresh invite link for someone who has not set a password yet (or forgot it).
create or replace function public.cp_team_resend_invite(p_site text, p_token text, p_member_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_actor jsonb := public.cp_team_actor(p_site, p_token);
  v_member public.client_site_access;
  v_credentials jsonb;
begin
  if not coalesce((v_actor ->> 'ok')::boolean, false) then
    return v_actor;
  end if;
  select * into v_member from public.client_site_access
    where id = p_member_id and client_site_id = (v_actor ->> 'site_id')::uuid for update;
  if not found or v_member.status = 'revoked' then
    return jsonb_build_object('ok', false, 'error', 'member_not_found');
  end if;
  if not public.cp_can_manage(v_actor ->> 'role', (v_actor ->> 'member_id')::uuid, v_member) then
    return jsonb_build_object('ok', false, 'error', 'not_allowed');
  end if;
  v_credentials := public.cp_issue_credentials(p_member_id, 'invite');
  perform public.cp_log(v_member.client_site_id, p_member_id, v_actor ->> 'actor', 'credentials_reset', jsonb_build_object('method', 'invite'));
  return jsonb_build_object('ok', true, 'member_id', p_member_id) || v_credentials;
end;
$$;

-- -----------------------------------------------------------------------------
-- Privileges: tables only through the functions; functions by audience
-- -----------------------------------------------------------------------------
alter table public.cp_platform_admins enable row level security;
alter table public.client_sites enable row level security;
alter table public.client_site_access enable row level security;
alter table public.cp_sessions enable row level security;
alter table public.cp_handoffs enable row level security;
alter table public.cp_audit_log enable row level security;

drop policy if exists "primary admin manages client sites" on public.client_sites;
drop policy if exists "primary admin manages client access" on public.client_site_access;

revoke all on table public.cp_platform_admins, public.client_sites, public.client_site_access,
  public.cp_sessions, public.cp_handoffs, public.cp_audit_log from anon, authenticated;
grant all on table public.cp_platform_admins, public.client_sites, public.client_site_access,
  public.cp_sessions, public.cp_handoffs, public.cp_audit_log to service_role;
revoke all on sequence public.cp_audit_log_id_seq from anon, authenticated;
grant usage, select on sequence public.cp_audit_log_id_seq to service_role;

do $$
declare
  r record;
  v_public constant text[] := array[
    'cp_login', 'cp_session', 'cp_logout', 'cp_invite_info', 'cp_redeem_invite', 'cp_change_password',
    'cp_exchange_handoff', 'cp_can', 'cp_session_role', 'cp_team_list', 'cp_team_invite', 'cp_team_update', 'cp_team_set_status',
    'cp_team_resend_invite'
  ];
  v_admin constant text[] := array[
    'cp_admin_me', 'cp_admin_overview', 'cp_admin_site_detail', 'cp_admin_save_site', 'cp_admin_delete_site',
    'cp_admin_create_member', 'cp_admin_update_member', 'cp_admin_set_member_status', 'cp_admin_reset_member',
    'cp_admin_delete_member', 'cp_admin_issue_handoff', 'cp_admin_set_developer_password', 'cp_admin_end_sessions',
    'cp_is_platform_admin', 'is_control_plane_admin'
  ];
begin
  for r in
    select p.oid::regprocedure as signature, p.proname
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and (p.proname like 'cp\_%' or p.proname = 'is_control_plane_admin')
  loop
    execute format('revoke all on function %s from public, anon, authenticated', r.signature);
    if r.proname = any (v_public) then
      execute format('grant execute on function %s to anon, authenticated, service_role', r.signature);
    elsif r.proname = any (v_admin) then
      execute format('grant execute on function %s to authenticated, service_role', r.signature);
    end if;
  end loop;
end;
$$;

-- -----------------------------------------------------------------------------
-- First client site
-- -----------------------------------------------------------------------------
insert into public.client_sites (display_name, business_name, slug, site_url, login_url, api_base_url, status, notes, modules)
values (
  'KBK Film Studios',
  'KBK Films',
  'kbk-film-studios',
  'https://kbk-film-studios-lake.vercel.app/',
  'https://kbk-film-studios-lake.vercel.app/owner',
  'https://kbk-film-studios-lake.vercel.app/api',
  'active',
  'Wedding film studio. The owner space covers bookings, service lifecycle, video deliveries, portfolio works, pricing and website content.',
  '[
    {"key": "bookings", "label": "Bookings"},
    {"key": "lifecycle", "label": "Service lifecycle"},
    {"key": "deliveries", "label": "Video deliveries"},
    {"key": "works", "label": "Works & testimonials"},
    {"key": "pricing", "label": "Pricing"},
    {"key": "cms", "label": "Website content"}
  ]'::jsonb
)
on conflict (slug) do update set
  modules = case when public.client_sites.modules = '[]'::jsonb then excluded.modules else public.client_sites.modules end,
  login_url = coalesce(public.client_sites.login_url, excluded.login_url),
  business_name = case when public.client_sites.business_name = '' then excluded.business_name else public.client_sites.business_name end;

-- Make the new functions visible to the API straight away.
notify pgrst, 'reload schema';
