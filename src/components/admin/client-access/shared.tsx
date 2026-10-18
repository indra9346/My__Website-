import { ReactNode, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { copyText, MemberRole, ROLE_LABELS, SiteMember, SiteStatus } from '@/lib/controlPlane';

// Same field styling as the other admin pages.
export const inputClass =
  'w-full px-3 py-2 bg-gray-900/50 border border-gray-700 rounded-lg focus:outline-none focus:border-neon-cyan text-foreground placeholder:text-gray-500 disabled:opacity-60';

export function Field({ label, hint, children, htmlFor }: { label: string; hint?: ReactNode; children: ReactNode; htmlFor?: string }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block mb-1.5 text-sm font-medium">
        {label}
      </label>
      {children}
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

const SITE_STATUS: Record<SiteStatus, { label: string; className: string }> = {
  active: { label: 'Active', className: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
  paused: { label: 'Paused', className: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
  archived: { label: 'Archived', className: 'bg-gray-500/15 text-gray-300 border-gray-500/30' },
};

export function SiteStatusBadge({ status }: { status: SiteStatus }) {
  const s = SITE_STATUS[status];
  return <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium', s.className)}>{s.label}</span>;
}

export function memberState(member: SiteMember): { label: string; className: string } {
  if (member.status === 'revoked') return { label: 'Revoked', className: 'bg-gray-500/15 text-gray-400 border-gray-500/30' };
  if (member.status === 'suspended') return { label: 'Suspended', className: 'bg-amber-500/15 text-amber-300 border-amber-500/30' };
  if (member.status === 'invited') {
    const expired = member.invite_expires_at && new Date(member.invite_expires_at) < new Date();
    return expired
      ? { label: 'Invite expired', className: 'bg-rose-500/15 text-rose-300 border-rose-500/30' }
      : { label: 'Invite sent', className: 'bg-sky-500/15 text-sky-300 border-sky-500/30' };
  }
  if (member.locked_until) return { label: 'Locked', className: 'bg-rose-500/15 text-rose-300 border-rose-500/30' };
  if (member.access_expires_at && new Date(member.access_expires_at) < new Date())
    return { label: 'Access ended', className: 'bg-gray-500/15 text-gray-300 border-gray-500/30' };
  if (member.must_change_password) return { label: 'Temporary password', className: 'bg-sky-500/15 text-sky-300 border-sky-500/30' };
  return { label: 'Active', className: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' };
}

export function MemberStatusBadge({ member }: { member: SiteMember }) {
  const s = memberState(member);
  return <span className={cn('inline-flex items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium', s.className)}>{s.label}</span>;
}

export function RoleBadge({ role }: { role: MemberRole | 'developer' }) {
  const strong = role === 'owner' || role === 'co_owner' || role === 'developer';
  return (
    <span
      className={cn(
        'inline-flex items-center whitespace-nowrap rounded px-1.5 py-0.5 text-xs font-semibold',
        strong ? 'bg-neon-cyan/15 text-neon-cyan' : 'bg-gray-700/60 text-gray-200',
      )}
    >
      {role === 'developer' ? 'Developer' : ROLE_LABELS[role]}
    </span>
  );
}

export function CopyButton({ text, label = 'Copy', className }: { text: string; label?: string; className?: string }) {
  const [done, setDone] = useState(false);
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={className}
      onClick={async () => {
        if (await copyText(text)) {
          setDone(true);
          window.setTimeout(() => setDone(false), 1600);
        }
      }}
    >
      {done ? <Check className="w-4 h-4 mr-1.5 text-emerald-400" /> : <Copy className="w-4 h-4 mr-1.5" />}
      {done ? 'Copied' : label}
    </Button>
  );
}

export function Spinner({ className }: { className?: string }) {
  return <div className={cn('animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-neon-cyan', className)} />;
}
