-- Portfolio projects: everyone can read them, only the portfolio admin can change them.
-- Run it in the Supabase SQL editor. It runs as one transaction and is safe to run again.

-- -----------------------------------------------------------------------------
-- 1. Table privileges
-- -----------------------------------------------------------------------------
-- Visitors got "permission denied for table projects" (HTTP 401), so the Projects
-- section of the live site showed "Failed to load projects" to everyone who was
-- not logged in to the admin. The promo banner in that section had the same problem.
grant select on table public.projects to anon, authenticated;
grant insert, update, delete on table public.projects to authenticated;
grant select on table public.promotions to anon, authenticated;

-- -----------------------------------------------------------------------------
-- 2. Row security
-- -----------------------------------------------------------------------------
-- This database is shared with other apps, so "any signed-in user" also meant their
-- users. Writes now need a portfolio platform admin (public.cp_platform_admins from
-- the client access control plane migration). Make sure the owner is one.
insert into public.cp_platform_admins (user_id, email, display_name)
select u.id, lower(u.email), 'K S Indra Kumar'
from auth.users u
where lower(u.email) = 'ik9893344@gmail.com'
on conflict (user_id) do nothing;

alter table public.projects enable row level security;

-- Earlier migrations created policies under many different names; start clean.
do $$
declare
  p record;
begin
  for p in select policyname from pg_policies where schemaname = 'public' and tablename = 'projects' loop
    execute format('drop policy %I on public.projects', p.policyname);
  end loop;
end;
$$;

create policy "projects_public_read" on public.projects
  for select to anon, authenticated
  using (true);

create policy "projects_admin_insert" on public.projects
  for insert to authenticated
  with check ((select public.is_control_plane_admin()));

create policy "projects_admin_update" on public.projects
  for update to authenticated
  using ((select public.is_control_plane_admin()))
  with check ((select public.is_control_plane_admin()));

create policy "projects_admin_delete" on public.projects
  for delete to authenticated
  using ((select public.is_control_plane_admin()));

-- -----------------------------------------------------------------------------
-- 3. Tidy values that were pasted from JSON
-- -----------------------------------------------------------------------------
-- "\"I_Mall - Frontend Project\"" -> I_Mall - Frontend Project
update public.projects
set title = btrim(substring(title from '^\s*["“”]([^"“”]*)["“”],?\s*$'))
where title ~ '^\s*["“”][^"“”]*["“”],?\s*$';

update public.projects
set "Description" = btrim(substring("Description" from '^\s*["“”]([^"“”]*)["“”],?\s*$'))
where "Description" ~ '^\s*["“”][^"“”]*["“”],?\s*$';

-- {"[\"React\"", "\"Vite\"", ...} -> {React, Vite, ...}, keeping order and dropping repeats.
update public.projects p
set "Tags" = coalesce((
  select array_agg(tag order by pos)
  from (
    select distinct on (lower(tag)) tag, pos
    from (
      select btrim(piece, E' \t\r\n[]"“”''‘’') as tag, a.ord * 1000 + b.ord as pos
      from unnest(p."Tags") with ordinality as a(element, ord)
      cross join lateral regexp_split_to_table(a.element, E'[,\\n]') with ordinality as b(piece, ord)
    ) pieces
    where tag <> ''
    order by lower(tag), pos
  ) unique_tags
), '{}')
where exists (
  select 1 from unnest(p."Tags") as e(element)
  where element ~ E'[][",\\n“”]' or element <> btrim(element)
);

-- -----------------------------------------------------------------------------
-- 4. Unique order numbers
-- -----------------------------------------------------------------------------
-- Several projects shared the same order number, so their order was up to the
-- database. Number them 1, 2, 3 ... in the order the site shows them now
-- (ties: oldest first). Skipped once every project has its own number.
with ordered as (
  select id, row_number() over (order by "Display_Order" asc nulls last, created_at asc, id) as n
  from public.projects
)
update public.projects p
set "Display_Order" = o.n
from ordered o
where o.id = p.id
  and p."Display_Order" is distinct from o.n
  and (select count(*) from public.projects) <> (select count(distinct "Display_Order") from public.projects);
