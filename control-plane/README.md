# Client access control plane

Every site or ERP built for a client gets its own sign-in, managed from **Admin → Client Sites & Access** in this portfolio:

- the business **owner**, **co-owners**, **managers**, **staff** and **viewers**;
- per-module rights (none / view / edit) and, if needed, a list of projects;
- invite links or temporary passwords, suspensions, access end dates, sign-out of every device, and an activity log;
- **developer access**: the portfolio admin can open any site with full rights ("Open as developer") or sign in on its own login page with a developer password.

All of it lives in this Supabase project (`hhqadycmsxsedlvdfcnn`) as `client_sites`, `client_site_access` and `cp_*` tables, reached only through `cp_*` database functions.

## One-time setup

Run [`supabase/migrations/20261018170000_client_access_control_plane.sql`](../supabase/migrations/20261018170000_client_access_control_plane.sql) in the Supabase SQL editor. (The admin page also shows a **Copy setup SQL** button.) It is additive and only touches `client_*` / `cp_*` objects, and running it again is safe. It makes `ik9893344@gmail.com` the first platform admin.

## Roles

| Role | Can use | Can manage people |
|---|---|---|
| Developer (you) | everything, on every site with developer access on | everyone, from the admin panel or inside the site |
| Owner (one per site) | every module | co-owners, managers, staff, viewers |
| Co-owner | every module | managers, staff, viewers |
| Manager / Staff | the modules you pick (view or edit) | no |
| Viewer | the modules you pick, view only | no |

People can sign in with their email or phone number. Five wrong passwords lock the account for 15 minutes, and 30 failures from one network block it for 15 minutes. Sessions end after the site's idle time (12 hours by default), and at most 30 days after sign-in. Suspending, revoking, pausing the site or changing a password signs people out the next time the site checks its session.

## Connecting a new site

1. **Register it** in the admin panel: name, site ID (e.g. `acme-erp`), address, the sign-in page URL, and its modules (e.g. `orders`, `billing`, `reports`).
2. **Copy [`cp-client.ts`](./cp-client.ts)** into the site. It has no dependencies.
3. **Sign people in**:

   ```ts
   import { createControlPlane } from './cp-client';

   export const cp = createControlPlane({
     supabaseUrl: 'https://hhqadycmsxsedlvdfcnn.supabase.co',
     anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
     site: 'acme-erp',
   });

   // On the sign-in page (the URL registered in the panel):
   const link = await cp.handleLink();
   //  { kind: 'signed_in', session }  -> "Open as developer" link, now signed in
   //  { kind: 'invite', invite, info } -> show "choose your password", then cp.acceptInvite(invite, password)
   //  { kind: 'error', link, error }   -> show error.message

   const session = await cp.restore();               // on page load
   const result = await cp.signIn(emailOrPhone, password);
   if (!result.ok) showError(result.message);
   if (result.ok && result.session.profile.must_change_password) askForNewPassword(); // cp.changePassword(current, next)
   ```

4. **Show only what people may use**: `cp.can('orders')`, `cp.can('orders', 'write')`, `cp.canSeeProject(id, reference)`, and `profile.can_manage_team` for a team page (`cp.team.list / invite / update / setStatus / resendInvite`).
5. **Check sessions on the server** (if the site has one): call `cp_session(p_site, p_token)` with the token from the `Authorization` header and use the returned profile. Cache it for no more than a minute.
6. **Protect the site's own tables.** Hiding buttons is not security. Without row level security, anyone with the anon key can still read and write the tables. Send the session with Supabase requests and check it in policies:

   ```ts
   createClient(url, anonKey, { global: { fetch: (input, init) => {
     const headers = new Headers(init?.headers);
     Object.entries(cp.sessionHeaders()).forEach(([k, v]) => headers.set(k, v));
     return fetch(input, { ...init, headers });
   } } });
   ```

   ```sql
   alter table public.orders enable row level security;
   create policy "acme: read orders"  on public.orders for select to anon using ((select public.cp_can('acme-erp', 'orders', 'read')));
   create policy "acme: edit orders"  on public.orders for update to anon using ((select public.cp_can('acme-erp', 'orders', 'write')));
   ```

   `cp_can` is false for anyone not signed in, signed out, suspended, past their end date, or still on a temporary password.

## Database functions

| For | Functions |
|---|---|
| Client sites (anon key) | `cp_login`, `cp_session`, `cp_logout`, `cp_invite_info`, `cp_redeem_invite`, `cp_change_password`, `cp_exchange_handoff`, `cp_can` |
| Owners inside a site | `cp_team_list`, `cp_team_invite`, `cp_team_update`, `cp_team_set_status`, `cp_team_resend_invite` |
| Admin panel (platform admins) | `cp_admin_overview`, `cp_admin_site_detail`, `cp_admin_save_site`, `cp_admin_delete_site`, `cp_admin_create_member`, `cp_admin_update_member`, `cp_admin_set_member_status`, `cp_admin_reset_member`, `cp_admin_delete_member`, `cp_admin_issue_handoff`, `cp_admin_set_developer_password`, `cp_admin_end_sessions` |

Each one returns `{ "ok": true, ... }` or `{ "ok": false, "error": "<code>" }`; `cpErrorMessage(code)` in the SDK turns codes into plain sentences. Passwords are bcrypt hashes. Session, invite and developer-link tokens are stored only as SHA-256 hashes, and invite and developer links work once.

## Adding another platform admin

```sql
insert into public.cp_platform_admins (user_id, email)
select id, lower(email) from auth.users where lower(email) = 'someone@example.com'
on conflict (user_id) do nothing;
```
