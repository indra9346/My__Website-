import { FormEvent, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import {
  AccessLevel,
  ClientSite,
  fullAccessRole,
  MemberInput,
  MemberRole,
  ROLE_HINTS,
  ROLE_LABELS,
  SiteMember,
} from '@/lib/controlPlane';
import { Field, inputClass } from './shared';

const ROLES: MemberRole[] = ['owner', 'co_owner', 'manager', 'staff', 'viewer'];
type Level = 'none' | AccessLevel;

function dateInputValue(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export type MemberSubmit = { input: MemberInput; method: 'invite' | 'password' };

export function MemberSheet({
  open,
  site,
  member,
  saving,
  onClose,
  onSubmit,
}: {
  open: boolean;
  site: ClientSite;
  member: SiteMember | null;
  saving: boolean;
  onClose: () => void;
  onSubmit: (value: MemberSubmit) => void;
}) {
  const isNew = !member;
  const ownerTaken = site.has_owner && member?.role !== 'owner';
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<MemberRole>('staff');
  const [rights, setRights] = useState<Record<string, Level>>({});
  const [allProjects, setAllProjects] = useState(true);
  const [projects, setProjects] = useState('');
  const [endsOn, setEndsOn] = useState('');
  const [notes, setNotes] = useState('');
  const [method, setMethod] = useState<'invite' | 'password'>('invite');

  useEffect(() => {
    if (!open) return;
    const startRole: MemberRole = member?.role ?? (site.has_owner ? 'staff' : 'owner');
    setName(member?.full_name ?? '');
    setEmail(member?.email ?? '');
    setPhone(member?.phone ?? '');
    setRole(startRole);
    setRights(Object.fromEntries(site.modules.map((m) => [m.key, (member?.permissions[m.key] ?? 'none') as Level])));
    const scope = member?.project_scope ?? ['all'];
    setAllProjects(scope.includes('all'));
    setProjects(scope.includes('all') ? '' : scope.join('\n'));
    setEndsOn(dateInputValue(member?.access_expires_at ?? null));
    setNotes(member?.notes ?? '');
    setMethod('invite');
    // Only when the sheet opens: a background refresh must not wipe what is being typed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, member?.id, site.id]);

  const full = fullAccessRole(role);
  const viewer = role === 'viewer';
  const setAll = (level: Level) => setRights(Object.fromEntries(site.modules.map((m) => [m.key, viewer && level === 'write' ? 'read' : level])));
  const projectList = projects
    .split(/[\n,]+/)
    .map((p) => p.trim())
    .filter(Boolean);
  const originalEnds = dateInputValue(member?.access_expires_at ?? null);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const permissions = Object.fromEntries(
      Object.entries(rights)
        .filter(([, level]) => level !== 'none')
        .map(([key, level]) => [key, viewer && level === 'write' ? 'read' : level]),
    ) as Record<string, AccessLevel>;
    // undefined keeps the saved end date as it is; null removes it.
    const access_expires_at =
      endsOn === originalEnds && !isNew ? undefined : endsOn ? new Date(`${endsOn}T23:59:59`).toISOString() : null;
    onSubmit({
      method,
      input: {
        full_name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        role,
        permissions,
        project_scope: allProjects || full ? ['all'] : projectList,
        access_expires_at,
        notes,
      },
    });
  };

  const today = dateInputValue(new Date().toISOString());

  return (
    <Sheet open={open} onOpenChange={(next) => (!next ? onClose() : undefined)}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isNew ? `Give someone access to ${site.display_name}` : `Edit ${member.full_name}`}</SheetTitle>
          <SheetDescription>
            {isNew
              ? 'They get their own sign-in for this site only. You can change or remove it at any time.'
              : 'Changes apply the next time the site checks their session (on their next page load).'}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={submit} className="space-y-4 mt-6">
          <Field label="Full name" htmlFor="m-name">
            <input id="m-name" className={inputClass} value={name} required maxLength={120} onChange={(e) => setName(e.target.value)} />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Email" htmlFor="m-email" hint="They sign in with this.">
              <input id="m-email" type="email" className={inputClass} value={email} required maxLength={254} onChange={(e) => setEmail(e.target.value)} />
            </Field>
            <Field label="Phone (optional)" htmlFor="m-phone" hint="They can also sign in with this.">
              <input id="m-phone" type="tel" className={inputClass} value={phone} maxLength={32} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98765 43210" />
            </Field>
          </div>

          <Field label="Role" htmlFor="m-role" hint={ROLE_HINTS[role]}>
            <select id="m-role" className={inputClass} value={role} onChange={(e) => setRole(e.target.value as MemberRole)}>
              {ROLES.map((r) => (
                <option key={r} value={r} disabled={r === 'owner' && ownerTaken}>
                  {ROLE_LABELS[r]}
                  {r === 'owner' && ownerTaken ? ' (this site has one)' : ''}
                </option>
              ))}
            </select>
          </Field>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm font-medium">What they can use</span>
              {!full && site.modules.length ? (
                <div className="flex gap-1 text-xs">
                  {!viewer ? (
                    <button type="button" className="px-2 py-0.5 rounded hover:text-neon-cyan" onClick={() => setAll('write')}>
                      Edit all
                    </button>
                  ) : null}
                  <button type="button" className="px-2 py-0.5 rounded hover:text-neon-cyan" onClick={() => setAll('read')}>
                    View all
                  </button>
                  <button type="button" className="px-2 py-0.5 rounded hover:text-neon-cyan" onClick={() => setAll('none')}>
                    Clear
                  </button>
                </div>
              ) : null}
            </div>
            {full ? (
              <p className="text-sm text-muted-foreground rounded-lg border border-gray-700 p-3">
                {ROLE_LABELS[role]}s can use every module{site.modules.length ? '' : ' (add modules in the site settings)'} and see all projects.
              </p>
            ) : site.modules.length === 0 ? (
              <p className="text-sm text-muted-foreground rounded-lg border border-gray-700 p-3">This site has no modules yet. Add them in the site settings.</p>
            ) : (
              <div className="rounded-lg border border-gray-700 divide-y divide-gray-800">
                {site.modules.map((m) => (
                  <div key={m.key} className="flex items-center justify-between gap-3 px-3 py-2">
                    <span className="text-sm min-w-0 truncate">{m.label}</span>
                    <div className="flex shrink-0 rounded-md border border-gray-700 overflow-hidden text-xs" role="radiogroup" aria-label={m.label}>
                      {(['none', 'read', 'write'] as Level[]).map((level) => {
                        const disabled = viewer && level === 'write';
                        const active = (rights[m.key] ?? 'none') === level;
                        return (
                          <button
                            key={level}
                            type="button"
                            role="radio"
                            aria-checked={active}
                            disabled={disabled}
                            onClick={() => setRights((r) => ({ ...r, [m.key]: level }))}
                            className={cn(
                              'px-2.5 py-1 transition-colors',
                              active ? (level === 'none' ? 'bg-gray-700 text-foreground' : 'bg-neon-cyan text-black font-semibold') : 'text-muted-foreground hover:text-foreground',
                              disabled && 'opacity-40 cursor-not-allowed hover:text-muted-foreground',
                            )}
                          >
                            {level === 'none' ? 'None' : level === 'read' ? 'View' : 'Edit'}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {!full ? (
            <div>
              <div className="text-sm font-medium mb-1.5">Projects</div>
              <div className="flex flex-wrap gap-4 text-sm mb-2">
                <label className="flex items-center gap-2">
                  <input type="radio" checked={allProjects} onChange={() => setAllProjects(true)} className="accent-[#03e9f4]" /> All projects
                </label>
                <label className="flex items-center gap-2">
                  <input type="radio" checked={!allProjects} onChange={() => setAllProjects(false)} className="accent-[#03e9f4]" /> Only some
                </label>
              </div>
              {!allProjects ? (
                <>
                  <textarea
                    rows={3}
                    className={inputClass}
                    value={projects}
                    onChange={(e) => setProjects(e.target.value)}
                    placeholder={'One per line: the project ID or booking reference the site shows'}
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    {projectList.length ? `${projectList.length} project${projectList.length === 1 ? '' : 's'}.` : 'No projects yet, so they will not see any.'}
                  </p>
                </>
              ) : null}
            </div>
          ) : null}

          <Field label="Access ends (optional)" htmlFor="m-ends" hint={endsOn ? `Access stops at the end of this day.` : 'Leave empty to keep access until you change it.'}>
            <div className="flex gap-2">
              <input id="m-ends" type="date" min={today} className={inputClass} value={endsOn} onChange={(e) => setEndsOn(e.target.value)} />
              {endsOn ? (
                <Button type="button" variant="ghost" size="sm" className="h-auto" onClick={() => setEndsOn('')}>
                  Clear
                </Button>
              ) : null}
            </div>
          </Field>

          <Field label="Notes (only you see these)" htmlFor="m-notes">
            <textarea id="m-notes" rows={2} className={inputClass} value={notes} maxLength={500} onChange={(e) => setNotes(e.target.value)} />
          </Field>

          {isNew ? (
            <div>
              <div className="text-sm font-medium mb-1.5">How they get in</div>
              <div className="grid gap-2">
                {(
                  [
                    ['invite', 'Invite link', 'They open the link and choose their own password. Best choice.'],
                    ['password', 'Temporary password', 'You share a password; they must change it after the first sign-in.'],
                  ] as const
                ).map(([value, title, text]) => (
                  <label
                    key={value}
                    className={cn(
                      'flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors',
                      method === value ? 'border-neon-cyan bg-neon-cyan/5' : 'border-gray-700 hover:border-gray-500',
                    )}
                  >
                    <input type="radio" className="mt-1 accent-[#03e9f4]" checked={method === value} onChange={() => setMethod(value)} />
                    <span>
                      <span className="block text-sm font-medium">{title}</span>
                      <span className="block text-xs text-muted-foreground">{text}</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
          ) : null}

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="bg-neon-cyan hover:bg-neon-cyan/80 text-black" disabled={saving}>
              {saving ? 'Saving…' : isNew ? (method === 'invite' ? 'Add and get invite link' : 'Add and get password') : 'Save changes'}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
