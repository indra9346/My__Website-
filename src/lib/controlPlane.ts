// Admin side of the client access control plane (see
// supabase/migrations/20261018170000_client_access_control_plane.sql).
// Every call goes through a cp_admin_* database function; the tables are not
// exposed to the API.
import { supabase } from '@/integrations/supabase/client';

export const SUPABASE_PROJECT_REF = 'hhqadycmsxsedlvdfcnn';
export const SUPABASE_SQL_EDITOR_URL = `https://supabase.com/dashboard/project/${SUPABASE_PROJECT_REF}/sql/new`;

export type SiteStatus = 'active' | 'paused' | 'archived';
export type MemberRole = 'owner' | 'co_owner' | 'manager' | 'staff' | 'viewer';
export type MemberStatus = 'invited' | 'active' | 'suspended' | 'revoked';
export type AccessLevel = 'read' | 'write';
export type SiteModule = { key: string; label: string };

export type ClientSite = {
  id: string;
  display_name: string;
  business_name: string;
  slug: string;
  site_url: string;
  login_url: string | null;
  api_base_url: string | null;
  status: SiteStatus;
  notes: string;
  modules: SiteModule[];
  developer_access: boolean;
  session_hours: number;
  created_at: string;
  updated_at: string;
  members_total: number;
  members_active: number;
  members_invited: number;
  members_suspended: number;
  has_owner: boolean;
  sessions_active: number;
  last_login_at: string | null;
};

export type SiteMember = {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  role: MemberRole;
  permissions: Record<string, AccessLevel>;
  project_scope: string[];
  status: MemberStatus;
  invite_pending: boolean;
  invite_expires_at: string | null;
  must_change_password: boolean;
  access_expires_at: string | null;
  locked_until: string | null;
  last_login_at: string | null;
  notes: string;
  created_by: string | null;
  created_at: string;
  sessions_active: number;
};

export type ActivityEntry = {
  id: number;
  at: string;
  actor: string;
  action: string;
  detail: Record<string, unknown>;
  ip: string | null;
  member_name: string | null;
};

export type AdminMe = { is_admin: boolean; email?: string; name?: string; has_developer_password?: boolean };
export type Overview = { me: AdminMe; sites: ClientSite[] };
export type SiteDetail = { site: ClientSite; members: SiteMember[]; activity: ActivityEntry[] };

export type Credentials =
  | { method: 'invite'; member_id: string; invite_url: string; invite_expires_at: string }
  | { method: 'password'; member_id: string; temporary_password: string; login_url: string };

export type SiteInput = {
  id?: string;
  display_name: string;
  business_name: string;
  slug: string;
  site_url: string;
  login_url: string;
  api_base_url: string;
  status: SiteStatus;
  notes: string;
  modules: SiteModule[];
  developer_access: boolean;
  session_hours: number;
};

export type MemberInput = {
  full_name: string;
  email: string;
  phone: string;
  role: MemberRole;
  permissions: Record<string, AccessLevel>;
  project_scope: string[];
  access_expires_at: string | null;
  notes: string;
};

const MESSAGES: Record<string, string> = {
  setup_required: 'The access tables are not set up in Supabase yet.',
  not_authorized: 'This account is not a platform admin.',
  network: 'Could not reach Supabase. Check the connection and try again.',
  invalid_input: 'Some of the details are not valid.',
  site_not_found: 'That site no longer exists.',
  site_archived: 'This site is archived. Make it active again first.',
  site_unavailable: 'The site is paused or archived, so nobody can sign in to it.',
  developer_access_off: 'Developer access is switched off for this site. Turn it on in the site settings.',
  archive_first: 'Archive the site before deleting it.',
  invalid_name: 'Enter a name (up to 120 characters).',
  invalid_slug: 'The site ID needs 2–48 lowercase letters, numbers or dashes.',
  slug_taken: 'Another site already uses this site ID.',
  slug_locked: 'The site ID cannot change once the site is registered.',
  invalid_url: 'Enter a full web address that starts with https://',
  invalid_status: 'Unknown status.',
  invalid_session_hours: 'Idle sign-out must be between 1 and 720 hours.',
  invalid_modules: 'The module list is not valid (up to 40 modules).',
  invalid_module_key: 'Module keys use lowercase letters, numbers and underscores, and start with a letter.',
  duplicate_module: 'Each module key can be used once.',
  invalid_email: 'Enter a valid email address.',
  invalid_phone: 'Enter a valid phone number, or leave it empty.',
  invalid_role: 'Choose a role.',
  role_not_allowed: 'That role is above what can be given here.',
  email_is_developer: 'That is your developer email. You already have full access to every site.',
  member_exists: 'Someone with this email already has access to this site.',
  owner_exists: 'This site already has an owner. Add this person as a co-owner, or change the current owner first.',
  phone_in_use: 'Another person on this site uses this phone number.',
  invalid_expiry: 'The access end date must be in the future.',
  member_not_found: 'That person is no longer on this site.',
  member_revoked: 'Their access was revoked. Send a new invite to bring them back.',
  not_allowed: 'You cannot change this person.',
  reissue_credentials: 'Their access was revoked. Send a new invite or a temporary password instead.',
  invite_pending: 'They have not accepted their invite yet.',
  revoke_first: 'Revoke their access before deleting the record.',
  password_too_short: 'The password is too short.',
  password_too_long: 'The password is too long (128 characters at most).',
  password_matches_email: 'The password cannot be the email address.',
  password_too_common: 'That password is too common. Choose another.',
};

export function errorMessage(code: string, field?: string): string {
  if (code === 'invalid_url' && field) {
    const label = { site_url: 'Site address', login_url: 'Sign-in page', api_base_url: 'API address' }[field] ?? 'Address';
    return `${label}: enter a full web address that starts with https://`;
  }
  return MESSAGES[code] ?? 'Something went wrong. Please try again.';
}

export class ControlPlaneError extends Error {
  code: string;
  constructor(code: string, message?: string) {
    super(message ?? errorMessage(code));
    this.code = code;
    this.name = 'ControlPlaneError';
  }
}

// PostgREST "function not found" / missing relation: the migration has not run.
const SETUP_CODES = new Set(['PGRST202', 'PGRST205', '42883', '42P01']);

async function call<T>(fn: string, args: Record<string, unknown> = {}): Promise<T> {
  // The generated Database type does not list these functions.
  const { data, error } = await (supabase as unknown as {
    rpc: (name: string, params: Record<string, unknown>) => Promise<{ data: any; error: { code?: string; message?: string } | null }>;
  }).rpc(fn, args);
  if (error) {
    if (SETUP_CODES.has(error.code ?? '') || /schema cache/i.test(error.message ?? '')) throw new ControlPlaneError('setup_required');
    if (error.code === '42501') throw new ControlPlaneError('not_authorized');
    throw new ControlPlaneError('network', error.message ? `${errorMessage('network')} (${error.message})` : undefined);
  }
  if (data && typeof data === 'object' && data.ok === false) {
    throw new ControlPlaneError(data.error ?? 'unknown', errorMessage(data.error ?? 'unknown', data.field));
  }
  return data as T;
}

export const cpAdmin = {
  overview: () => call<Overview>('cp_admin_overview'),
  siteDetail: (siteId: string) => call<SiteDetail>('cp_admin_site_detail', { p_site_id: siteId }),
  saveSite: (site: SiteInput) => call<{ site: ClientSite }>('cp_admin_save_site', { p_site: site }),
  deleteSite: (siteId: string) => call<void>('cp_admin_delete_site', { p_site_id: siteId }),
  createMember: (siteId: string, input: MemberInput, method: 'invite' | 'password') =>
    call<Credentials>('cp_admin_create_member', {
      p_site_id: siteId,
      p_full_name: input.full_name,
      p_email: input.email,
      p_phone: input.phone,
      p_role: input.role,
      p_permissions: input.permissions,
      p_project_scope: input.project_scope,
      p_access_expires_at: input.access_expires_at,
      p_method: method,
      p_notes: input.notes,
    }),
  updateMember: (memberId: string, input: MemberInput) =>
    call<void>('cp_admin_update_member', {
      p_member_id: memberId,
      p_full_name: input.full_name,
      p_email: input.email,
      p_phone: input.phone,
      p_role: input.role,
      p_permissions: input.permissions,
      p_project_scope: input.project_scope,
      p_access_expires_at: input.access_expires_at,
      p_clear_expiry: input.access_expires_at === null,
      p_notes: input.notes,
    }),
  setMemberStatus: (memberId: string, status: 'active' | 'suspended' | 'revoked') =>
    call<{ status: MemberStatus }>('cp_admin_set_member_status', { p_member_id: memberId, p_status: status }),
  resetMember: (memberId: string, method: 'invite' | 'password') =>
    call<Credentials>('cp_admin_reset_member', { p_member_id: memberId, p_method: method }),
  deleteMember: (memberId: string) => call<void>('cp_admin_delete_member', { p_member_id: memberId }),
  developerLink: (siteId: string) => call<{ url: string; expires_at: string }>('cp_admin_issue_handoff', { p_site_id: siteId }),
  setDeveloperPassword: (password: string) => call<void>('cp_admin_set_developer_password', { p_password: password }),
  endSessions: (siteId: string, memberId?: string) =>
    call<{ ended: number }>('cp_admin_end_sessions', { p_site_id: siteId, p_member_id: memberId ?? null }),
};

export const ROLE_LABELS: Record<MemberRole, string> = {
  owner: 'Owner',
  co_owner: 'Co-owner',
  manager: 'Manager',
  staff: 'Staff',
  viewer: 'Viewer',
};

export const ROLE_HINTS: Record<MemberRole, string> = {
  owner: 'The business owner. Full access, and manages their own team. One per site.',
  co_owner: 'Full access. Can add and manage managers, staff and viewers.',
  manager: 'Only the modules you choose below.',
  staff: 'Only the modules you choose below.',
  viewer: 'Can look but not change anything, in the modules you choose.',
};

export const fullAccessRole = (role: MemberRole) => role === 'owner' || role === 'co_owner';

export function suggestSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48);
}

export function moduleKey(label: string): string {
  const key = label
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 32);
  return /^[a-z]/.test(key) ? key : key ? `m_${key}`.slice(0, 32) : '';
}

/** "Edit: Bookings, Works · View: Pricing" */
export function describeRights(member: Pick<SiteMember, 'role' | 'permissions'>, modules: SiteModule[]): string {
  if (fullAccessRole(member.role)) return 'Full access';
  const label = (key: string) => modules.find((m) => m.key === key)?.label ?? key;
  const edit = modules.filter((m) => member.permissions[m.key] === 'write').map((m) => label(m.key));
  const view = modules.filter((m) => member.permissions[m.key] === 'read').map((m) => label(m.key));
  if (modules.length && edit.length === modules.length) return 'Edit: everything';
  const parts = [edit.length ? `Edit: ${edit.join(', ')}` : '', view.length ? `View: ${view.join(', ')}` : ''].filter(Boolean);
  return parts.length ? parts.join(' · ') : 'No modules yet';
}

export function whatsappLink(phone: string, text: string): string {
  let digits = phone.replace(/\D/g, '');
  if (digits.length === 10) digits = `91${digits}`; // numbers saved without a country code are Indian
  return `https://wa.me/${digits.length >= 11 ? digits : ''}?text=${encodeURIComponent(text)}`;
}

export function credentialMessage(
  credentials: Credentials,
  person: { full_name: string; email: string; role: MemberRole },
  site: Pick<ClientSite, 'display_name' | 'business_name'>,
): string {
  const where = site.business_name ? `${site.display_name} (${site.business_name})` : site.display_name;
  const first = person.full_name.split(' ')[0];
  if (credentials.method === 'invite') {
    return [
      `Hi ${first}, you now have ${ROLE_LABELS[person.role].toLowerCase()} access to ${where}.`,
      `Open this link to set your password (valid for 7 days):`,
      credentials.invite_url,
    ].join('\n');
  }
  return [
    `Hi ${first}, you now have ${ROLE_LABELS[person.role].toLowerCase()} access to ${where}.`,
    `Sign in at ${credentials.login_url}`,
    `Email: ${person.email}`,
    `Temporary password: ${credentials.temporary_password}`,
    `You will be asked to choose your own password after signing in.`,
  ].join('\n');
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand('copy');
    area.remove();
    return ok;
  }
}

const rtf = typeof Intl !== 'undefined' && 'RelativeTimeFormat' in Intl ? new Intl.RelativeTimeFormat('en', { numeric: 'auto' }) : null;

export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return 'never';
  const seconds = Math.round((new Date(iso).getTime() - Date.now()) / 1000);
  const abs = Math.abs(seconds);
  if (!rtf) return new Date(iso).toLocaleString();
  if (abs < 45) return 'just now';
  if (abs < 3600) return rtf.format(Math.round(seconds / 60), 'minute');
  if (abs < 86400) return rtf.format(Math.round(seconds / 3600), 'hour');
  if (abs < 86400 * 30) return rtf.format(Math.round(seconds / 86400), 'day');
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '';
  return new Date(iso).toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}
