/**
 * Client SDK for the access control plane (the "Client Sites & Access" panel
 * in the portfolio admin). Copy this file into a client site or ERP; it has no
 * dependencies and works with or without supabase-js.
 *
 *   const cp = createControlPlane({ supabaseUrl, anonKey, site: 'kbk-film-studios' });
 *   await cp.handleLink();               // ?cp_invite=… / ?cp_handoff=… on the sign-in page
 *   const session = await cp.restore();  // already signed in?
 *   const result = await cp.signIn(emailOrPhone, password);
 *   cp.can('bookings', 'write');
 *
 * Guide: control-plane/README.md in the portfolio repo.
 */

export type CpRole = 'developer' | 'owner' | 'co_owner' | 'manager' | 'staff' | 'viewer';
export type CpMemberRole = Exclude<CpRole, 'developer'>;
export type CpLevel = 'read' | 'write';
export type CpModule = { key: string; label: string };

export type CpProfile = {
  id: string;
  kind: 'member' | 'developer';
  name: string;
  email: string;
  phone: string;
  role: CpRole;
  permissions: Record<string, CpLevel>;
  /** ["all"], or the project ids / references this person is limited to. */
  project_scope: string[];
  can_manage_team: boolean;
  must_change_password: boolean;
  access_expires_at: string | null;
  site: { slug: string; name: string; business: string; modules: CpModule[] };
};

export type CpSession = { token: string; expiresAt: string; profile: CpProfile };

export type CpErrorCode =
  | 'invalid_credentials'
  | 'locked'
  | 'too_many_attempts'
  | 'suspended'
  | 'access_expired'
  | 'site_unavailable'
  | 'invite_invalid'
  | 'invite_expired'
  | 'handoff_invalid'
  | 'session_expired'
  | 'session_revoked'
  | 'session_invalid'
  | 'password_too_short'
  | 'password_too_long'
  | 'password_matches_email'
  | 'password_too_common'
  | 'password_unchanged'
  | 'password_change_required'
  | 'use_admin_panel'
  | 'not_allowed'
  | 'role_not_allowed'
  | 'member_exists'
  | 'owner_exists'
  | 'phone_in_use'
  | 'email_is_developer'
  | 'invalid_email'
  | 'invalid_phone'
  | 'invalid_name'
  | 'invalid_role'
  | 'invalid_expiry'
  | 'invalid_status'
  | 'member_not_found'
  | 'member_revoked'
  | 'reissue_credentials'
  | 'invite_pending'
  | 'not_signed_in'
  | 'not_set_up'
  | 'network'
  | (string & {});

export type CpFailure = { ok: false; error: CpErrorCode; message: string; retryAfterSeconds?: number };
export type CpResult<T = object> = ({ ok: true } & T) | CpFailure;

export type CpInviteInfo = { name: string; email: string; role: CpMemberRole; expires_at: string; site: CpProfile['site'] };

export type CpTeamMember = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: CpMemberRole;
  status: 'invited' | 'active' | 'suspended';
  permissions: Record<string, CpLevel>;
  project_scope: string[];
  access_expires_at: string | null;
  last_login_at: string | null;
  /** Whether the signed-in person may change this member. */
  can_manage: boolean;
};

export type CpTeamInput = {
  name: string;
  email: string;
  phone?: string;
  role: CpMemberRole;
  permissions?: Record<string, CpLevel>;
  projectScope?: string[];
  accessExpiresAt?: string | null;
};

export type CpLinkResult =
  | { kind: 'signed_in'; session: CpSession }
  | { kind: 'invite'; invite: string; info: CpInviteInfo }
  | { kind: 'error'; link: 'invite' | 'handoff'; error: CpFailure };

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export interface ControlPlaneOptions {
  /** e.g. https://<project>.supabase.co (a function is read on every call). */
  supabaseUrl: string | (() => string);
  /** The project's anon / publishable key. */
  anonKey: string | (() => string);
  /** The site ID from the admin panel. */
  site: string;
  /** Where the session is kept; defaults to localStorage. Pass null to keep it in memory. */
  storage?: StorageLike | null;
  storageKey?: string;
  fetch?: typeof fetch;
}

const MESSAGES: Record<string, string> = {
  invalid_credentials: 'That email or phone number and password do not match.',
  locked: 'Too many wrong attempts. Try again in a few minutes.',
  too_many_attempts: 'Too many attempts from this network. Wait 15 minutes and try again.',
  suspended: 'Your access is on hold. Please contact the site owner.',
  access_expired: 'Your access period has ended. Please contact the site owner.',
  site_unavailable: 'Sign-in is switched off for this site at the moment.',
  invite_invalid: 'This invite link is no longer valid. Ask for a new one.',
  invite_expired: 'This invite link has expired. Ask for a new one.',
  handoff_invalid: 'This developer link has expired or was already used. Open the site again from the admin panel.',
  session_expired: 'Your session has ended. Please sign in again.',
  session_revoked: 'You were signed out because your access changed.',
  session_invalid: 'Please sign in again.',
  password_too_short: 'Use at least 8 characters.',
  password_too_long: 'Use 128 characters or fewer.',
  password_matches_email: 'The password cannot be your email address.',
  password_too_common: 'That password is too easy to guess. Choose another.',
  password_unchanged: 'Choose a password different from the current one.',
  password_change_required: 'Change your temporary password first.',
  use_admin_panel: 'Developer passwords are changed from the admin panel.',
  not_allowed: 'You do not have permission to do that.',
  role_not_allowed: 'You can only give roles below your own.',
  member_exists: 'Someone with this email already has access.',
  owner_exists: 'This site already has an owner.',
  phone_in_use: 'Someone else on this site uses this phone number.',
  email_is_developer: 'That is the developer’s email, which already has full access.',
  invalid_email: 'Enter a valid email address.',
  invalid_phone: 'Enter a valid phone number, or leave it empty.',
  invalid_name: 'Enter a name.',
  invalid_role: 'Choose a role.',
  invalid_expiry: 'The end date must be in the future.',
  invalid_status: 'Unknown status.',
  member_not_found: 'That person is no longer on the team.',
  member_revoked: 'Their access was removed. Invite them again instead.',
  reissue_credentials: 'Their access was removed. Invite them again instead.',
  invite_pending: 'They have not accepted their invite yet.',
  not_signed_in: 'Please sign in first.',
  not_set_up: 'Sign-in is not set up for this site yet.',
  network: 'Could not connect. Check the internet connection and try again.',
};

export function cpErrorMessage(code: string): string {
  return MESSAGES[code] ?? 'Something went wrong. Please try again.';
}

function failure(error: string, extra?: { retry_after_seconds?: number }): CpFailure {
  return { ok: false, error, message: cpErrorMessage(error), retryAfterSeconds: extra?.retry_after_seconds };
}

function defaultStorage(): StorageLike | null {
  try {
    return typeof window !== 'undefined' && window.localStorage ? window.localStorage : null;
  } catch {
    return null;
  }
}

export function createControlPlane(options: ControlPlaneOptions) {
  const site = options.site;
  const storageKey = options.storageKey ?? `cp_session:${site}`;
  const storage = options.storage === undefined ? defaultStorage() : options.storage;
  const doFetch: typeof fetch = options.fetch ?? ((...args) => fetch(...args));
  const read = (v: string | (() => string)) => (typeof v === 'function' ? v() : v);
  const listeners = new Set<(session: CpSession | null) => void>();
  let memory: CpSession | null = null;

  function load(): CpSession | null {
    if (!storage) return memory;
    try {
      const raw = storage.getItem(storageKey);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as CpSession;
      return parsed?.token && parsed.profile ? parsed : null;
    } catch {
      return null;
    }
  }

  function save(session: CpSession | null) {
    memory = session;
    if (storage) {
      try {
        if (session) storage.setItem(storageKey, JSON.stringify(session));
        else storage.removeItem(storageKey);
      } catch {
        /* storage full or blocked: the session still lives in memory */
      }
    }
    listeners.forEach((fn) => fn(session));
  }

  if (typeof window !== 'undefined' && storage) {
    // Keep tabs in step: signing out in one tab signs out the others.
    window.addEventListener('storage', (event) => {
      if (event.key === storageKey) listeners.forEach((fn) => fn(load()));
    });
  }

  async function rpc(fn: string, args: Record<string, unknown>): Promise<Record<string, any>> {
    const url = read(options.supabaseUrl).replace(/\/+$/, '');
    const key = read(options.anonKey);
    let res: Response;
    try {
      res = await doFetch(`${url}/rest/v1/rpc/${fn}`, {
        method: 'POST',
        headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(args),
      });
    } catch {
      return failure('network');
    }
    if (res.status === 404) return failure('not_set_up');
    if (!res.ok) return failure('network');
    try {
      const body = await res.json();
      return body && typeof body === 'object' ? body : failure('network');
    } catch {
      return failure('network');
    }
  }

  const asFailure = (body: Record<string, any>): CpFailure =>
    body.message && body.ok === false && 'retryAfterSeconds' in body ? (body as CpFailure) : failure(body.error ?? 'network', body);

  function startSession(body: Record<string, any>): CpResult<{ session: CpSession }> {
    if (body.ok !== true) return asFailure(body);
    const session: CpSession = { token: body.session_token, expiresAt: body.expires_at, profile: body.profile };
    save(session);
    return { ok: true, session };
  }

  function stripParams(...names: string[]) {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    let changed = false;
    for (const name of names) {
      if (url.searchParams.has(name)) {
        url.searchParams.delete(name);
        changed = true;
      }
    }
    if (changed) window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
  }

  const api = {
    site,

    /** The stored session, without checking it with the server. */
    getSession: (): CpSession | null => load(),
    getProfile: (): CpProfile | null => load()?.profile ?? null,

    /** True when the signed-in person may use a module at this level. */
    can(module: string, level: CpLevel = 'read'): boolean {
      const profile = load()?.profile;
      if (!profile || profile.must_change_password) return false;
      if (profile.role === 'developer') return true;
      const granted = profile.permissions[module];
      return level === 'write' ? granted === 'write' : granted === 'read' || granted === 'write';
    },

    /** True when the person may see this project (by id or reference). */
    canSeeProject(...ids: Array<string | null | undefined>): boolean {
      const scope = load()?.profile.project_scope ?? [];
      return scope.includes('all') || ids.some((id) => id && scope.includes(id));
    },

    /** Header for the site's own Supabase requests, so row level security can call cp_can(). */
    sessionHeaders(): Record<string, string> {
      const token = load()?.token;
      return token ? { 'x-cp-session': token } : {};
    },

    onChange(listener: (session: CpSession | null) => void): () => void {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    async signIn(identifier: string, password: string) {
      return startSession(await rpc('cp_login', { p_site: site, p_identifier: identifier, p_password: password }));
    },

    /**
     * Checks the stored session with the server and refreshes the profile (rights
     * may have changed). Returns null and clears it when it is no longer valid.
     * A network failure keeps the stored session.
     */
    async restore(): Promise<CpSession | null> {
      const current = load();
      if (!current) return null;
      const body = await rpc('cp_session', { p_site: site, p_token: current.token });
      if (body.ok === true) {
        const session: CpSession = { token: current.token, expiresAt: body.expires_at, profile: body.profile };
        save(session);
        return session;
      }
      if (body.error === 'network' || body.error === 'not_set_up') return current;
      save(null);
      return null;
    },

    /** Like restore(), but tells you why a session ended. */
    async verify(): Promise<CpResult<{ session: CpSession }>> {
      const current = load();
      if (!current) return failure('not_signed_in');
      const body = await rpc('cp_session', { p_site: site, p_token: current.token });
      if (body.ok === true) {
        const session: CpSession = { token: current.token, expiresAt: body.expires_at, profile: body.profile };
        save(session);
        return { ok: true, session };
      }
      if (body.error !== 'network' && body.error !== 'not_set_up') save(null);
      return asFailure(body);
    },

    async signOut(): Promise<void> {
      const current = load();
      save(null);
      if (current) await rpc('cp_logout', { p_token: current.token });
    },

    async inviteInfo(invite: string): Promise<CpResult<{ info: CpInviteInfo }>> {
      const body = await rpc('cp_invite_info', { p_site: site, p_invite: invite });
      if (body.ok !== true) return asFailure(body);
      const info = { name: body.name, email: body.email, role: body.role, expires_at: body.expires_at, site: body.site } as CpInviteInfo;
      return { ok: true, info };
    },

    async acceptInvite(invite: string, newPassword: string) {
      return startSession(await rpc('cp_redeem_invite', { p_site: site, p_invite: invite, p_new_password: newPassword }));
    },

    async exchangeHandoff(handoff: string) {
      return startSession(await rpc('cp_exchange_handoff', { p_site: site, p_handoff: handoff }));
    },

    /**
     * Handles ?cp_handoff (developer "Open as developer" links: signs in) and
     * ?cp_invite (returns the invite for a "choose your password" screen). The
     * parameter is removed from the address bar either way.
     */
    async handleLink(href?: string): Promise<CpLinkResult | null> {
      if (typeof window === 'undefined' && !href) return null;
      const url = new URL(href ?? window.location.href);
      const handoff = url.searchParams.get('cp_handoff');
      const invite = url.searchParams.get('cp_invite');
      if (!handoff && !invite) return null;
      stripParams('cp_handoff', 'cp_invite');
      if (handoff) {
        const result = await api.exchangeHandoff(handoff);
        return result.ok ? { kind: 'signed_in', session: result.session } : { kind: 'error', link: 'handoff', error: result };
      }
      const info = await api.inviteInfo(invite!);
      return info.ok ? { kind: 'invite', invite: invite!, info: info.info } : { kind: 'error', link: 'invite', error: info };
    },

    async changePassword(currentPassword: string, newPassword: string): Promise<CpResult<{ profile: CpProfile }>> {
      const current = load();
      if (!current) return failure('not_signed_in');
      const body = await rpc('cp_change_password', {
        p_site: site,
        p_token: current.token,
        p_current_password: currentPassword,
        p_new_password: newPassword,
      });
      if (body.ok !== true) {
        if (['session_expired', 'session_revoked', 'session_invalid', 'site_unavailable'].includes(body.error)) save(null);
        return asFailure(body);
      }
      save({ ...current, profile: body.profile });
      return { ok: true, profile: body.profile };
    },

    /** Team management for owners, co-owners and the developer. */
    team: {
      async list(): Promise<CpResult<{ members: CpTeamMember[] }>> {
        const token = load()?.token;
        if (!token) return failure('not_signed_in');
        const body = await rpc('cp_team_list', { p_site: site, p_token: token });
        return body.ok === true ? { ok: true, members: body.members } : asFailure(body);
      },
      async invite(input: CpTeamInput): Promise<CpResult<{ member_id: string; invite_url: string; invite_expires_at: string }>> {
        const token = load()?.token;
        if (!token) return failure('not_signed_in');
        const body = await rpc('cp_team_invite', {
          p_site: site,
          p_token: token,
          p_full_name: input.name,
          p_email: input.email,
          p_phone: input.phone ?? '',
          p_role: input.role,
          p_permissions: input.permissions ?? {},
          p_project_scope: input.projectScope ?? ['all'],
          p_access_expires_at: input.accessExpiresAt ?? null,
        });
        return body.ok === true ? (body as { ok: true; member_id: string; invite_url: string; invite_expires_at: string }) : asFailure(body);
      },
      async update(
        memberId: string,
        patch: { role?: CpMemberRole; permissions?: Record<string, CpLevel>; projectScope?: string[]; accessExpiresAt?: string | null },
      ): Promise<CpResult> {
        const token = load()?.token;
        if (!token) return failure('not_signed_in');
        const body = await rpc('cp_team_update', {
          p_site: site,
          p_token: token,
          p_member_id: memberId,
          p_role: patch.role ?? null,
          p_permissions: patch.permissions ?? null,
          p_project_scope: patch.projectScope ?? null,
          p_access_expires_at: patch.accessExpiresAt ?? null,
          p_clear_expiry: patch.accessExpiresAt === null,
        });
        return body.ok === true ? { ok: true } : asFailure(body);
      },
      async setStatus(memberId: string, status: 'active' | 'suspended' | 'revoked'): Promise<CpResult<{ status: string }>> {
        const token = load()?.token;
        if (!token) return failure('not_signed_in');
        const body = await rpc('cp_team_set_status', { p_site: site, p_token: token, p_member_id: memberId, p_status: status });
        return body.ok === true ? { ok: true, status: body.status } : asFailure(body);
      },
      async resendInvite(memberId: string): Promise<CpResult<{ invite_url: string; invite_expires_at: string }>> {
        const token = load()?.token;
        if (!token) return failure('not_signed_in');
        const body = await rpc('cp_team_resend_invite', { p_site: site, p_token: token, p_member_id: memberId });
        return body.ok === true ? { ok: true, invite_url: body.invite_url, invite_expires_at: body.invite_expires_at } : asFailure(body);
      },
    },
  };

  return api;
}

export type ControlPlane = ReturnType<typeof createControlPlane>;
