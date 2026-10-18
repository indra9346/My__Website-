import { AlertTriangle, KeyRound, LogIn, LogOut, Settings2, ShieldCheck, UserCog, UserMinus, UserPlus } from 'lucide-react';
import { ActivityEntry, formatDateTime, ROLE_LABELS, MemberRole, timeAgo } from '@/lib/controlPlane';

function who(entry: ActivityEntry, myEmail?: string): string {
  if (entry.actor === `developer:${myEmail}`) return 'You';
  if (entry.actor.startsWith('developer')) return 'Developer';
  if (entry.actor === 'system') return 'System';
  return entry.member_name ?? entry.actor.replace(/^member:/, '');
}

function roleName(value: unknown): string {
  return typeof value === 'string' && value in ROLE_LABELS ? ROLE_LABELS[value as MemberRole].toLowerCase() : String(value ?? '');
}

function describe(entry: ActivityEntry, myEmail?: string): { text: string; tone: 'normal' | 'warn' | 'good' } {
  const d = entry.detail ?? {};
  const actor = who(entry, myEmail);
  const person = entry.member_name ?? (typeof d.email === 'string' ? d.email : 'someone');
  switch (entry.action) {
    case 'login':
      return { text: `${person} signed in`, tone: 'good' };
    case 'developer_login':
      return { text: `${actor === 'You' ? 'You' : 'Developer'} opened the site as developer${d.via === 'admin_panel' ? ' from this panel' : ''}`, tone: 'good' };
    case 'login_failed':
      return { text: `Failed sign-in for ${String(d.identifier ?? person)}`, tone: 'warn' };
    case 'logout':
      return { text: `${entry.member_name ?? (entry.actor === 'developer' ? 'Developer' : 'Someone')} signed out`, tone: 'normal' };
    case 'invite_accepted':
      return { text: `${person} accepted the invite and set a password`, tone: 'good' };
    case 'password_changed':
      return { text: `${person} changed their password`, tone: 'normal' };
    case 'member_added':
      return { text: `${actor} gave ${String(d.email ?? person)} ${roleName(d.role)} access (${d.method === 'password' ? 'temporary password' : 'invite link'})`, tone: 'normal' };
    case 'member_updated':
      return {
        text: d.previous_role
          ? `${actor} changed ${person} from ${roleName(d.previous_role)} to ${roleName(d.role)}`
          : `${actor} updated ${person}'s access`,
        tone: 'normal',
      };
    case 'member_suspended':
      return { text: `${actor} suspended ${person}`, tone: 'warn' };
    case 'member_restored':
      return { text: `${actor} restored ${person}`, tone: 'normal' };
    case 'member_revoked':
      return { text: `${actor} revoked ${person}'s access`, tone: 'warn' };
    case 'member_deleted':
      return { text: `${actor} deleted the record for ${String(d.name ?? d.email ?? 'a person')}`, tone: 'warn' };
    case 'credentials_reset':
      return { text: `${actor} sent ${person} a new ${d.method === 'password' ? 'temporary password' : 'invite link'}`, tone: 'normal' };
    case 'sessions_ended':
      return { text: `${actor} signed out ${entry.member_name ?? 'everyone'} (${Number(d.count ?? 0)} session${Number(d.count) === 1 ? '' : 's'})`, tone: 'normal' };
    case 'developer_link_created':
      return { text: `${actor} opened a developer sign-in link`, tone: 'normal' };
    case 'site_created':
      return { text: `${actor} registered the site`, tone: 'normal' };
    case 'site_updated':
      return { text: `${actor} changed the site settings`, tone: 'normal' };
    case 'site_paused':
      return { text: `${actor} paused the site; everyone was signed out`, tone: 'warn' };
    case 'site_archived':
      return { text: `${actor} archived the site`, tone: 'warn' };
    case 'site_active':
      return { text: `${actor} made the site active again`, tone: 'good' };
    default:
      return { text: `${actor}: ${entry.action.replace(/_/g, ' ')}`, tone: 'normal' };
  }
}

function Icon({ action }: { action: string }) {
  const cls = 'w-4 h-4';
  if (action === 'login' || action === 'developer_login' || action === 'invite_accepted') return <LogIn className={cls} />;
  if (action === 'login_failed') return <AlertTriangle className={cls} />;
  if (action === 'logout' || action === 'sessions_ended') return <LogOut className={cls} />;
  if (action === 'member_added') return <UserPlus className={cls} />;
  if (action === 'member_revoked' || action === 'member_deleted' || action === 'member_suspended') return <UserMinus className={cls} />;
  if (action === 'credentials_reset' || action === 'password_changed') return <KeyRound className={cls} />;
  if (action.startsWith('member_')) return <UserCog className={cls} />;
  if (action.startsWith('developer')) return <ShieldCheck className={cls} />;
  return <Settings2 className={cls} />;
}

export function ActivityFeed({ entries, myEmail }: { entries: ActivityEntry[]; myEmail?: string }) {
  if (!entries.length) {
    return <p className="text-sm text-muted-foreground py-8 text-center">Nothing has happened on this site yet.</p>;
  }
  return (
    <ul className="divide-y divide-gray-800">
      {entries.map((entry) => {
        const { text, tone } = describe(entry, myEmail);
        return (
          <li key={entry.id} className="flex items-start gap-3 py-2.5">
            <span
              className={
                tone === 'warn' ? 'text-amber-300 mt-0.5' : tone === 'good' ? 'text-emerald-300 mt-0.5' : 'text-muted-foreground mt-0.5'
              }
            >
              <Icon action={entry.action} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm break-words">{text}</p>
              <p className="text-xs text-muted-foreground" title={formatDateTime(entry.at)}>
                {timeAgo(entry.at)}
                {entry.ip ? ` · ${entry.ip}` : ''}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
