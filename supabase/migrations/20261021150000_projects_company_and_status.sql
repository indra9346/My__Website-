-- Company projects: which company a project was for, and whether it is still ongoing.
-- Run it in the Supabase SQL editor. It runs as one transaction and is safe to run again.
-- Only adds columns. TileRoom's rows (which share this table) just get status 'completed',
-- which TileRoom never reads.

alter table public.projects add column if not exists company text;
alter table public.projects add column if not exists status text not null default 'completed';

alter table public.projects drop constraint if exists projects_status_check;
alter table public.projects add constraint projects_status_check
  check (status in ('completed', 'ongoing'));

-- A project filed under "Company Projects" must say which company it was for.
alter table public.projects drop constraint if exists projects_company_check;
alter table public.projects add constraint projects_company_check
  check (category <> 'Company Projects' or nullif(btrim(company), '') is not null);
