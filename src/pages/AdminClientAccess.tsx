import { ReactNode, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Ban,
  ExternalLink,
  KeyRound,
  Link2,
  LogOut,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  Settings2,
  ShieldCheck,
  Trash2,
  UserPlus,
  UserX,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  ClientSite,
  ControlPlaneError,
  cpAdmin,
  describeRights,
  formatDate,
  formatDateTime,
  SiteInput,
  SiteMember,
  timeAgo,
} from '@/lib/controlPlane';
import { MemberStatusBadge, RoleBadge, SiteStatusBadge, Spinner } from '@/components/admin/client-access/shared';
import { NotPlatformAdmin, SetupRequired } from '@/components/admin/client-access/SetupNotice';
import { SiteSheet } from '@/components/admin/client-access/SiteSheet';
import { MemberSheet, MemberSubmit } from '@/components/admin/client-access/MemberSheet';
import { CredentialsDialog, IssuedCredentials } from '@/components/admin/client-access/CredentialsDialog';
import { ActivityFeed } from '@/components/admin/client-access/ActivityFeed';
import { IntegrationPanel } from '@/components/admin/client-access/IntegrationPanel';
import { DeveloperCard } from '@/components/admin/client-access/DeveloperCard';

type Confirm = { title: string; body: ReactNode; label: string; danger?: boolean; run: () => Promise<void> };

const stopRetryOn = new Set(['setup_required', 'not_authorized']);

export default function AdminClientAccess() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [params, setParams] = useSearchParams();
  const [signedInEmail, setSignedInEmail] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [siteSheet, setSiteSheet] = useState<{ open: boolean; site: ClientSite | null }>({ open: false, site: null });
  const [memberSheet, setMemberSheet] = useState<{ open: boolean; member: SiteMember | null }>({ open: false, member: null });
  const [issued, setIssued] = useState<IssuedCredentials | null>(null);
  const [confirm, setConfirm] = useState<Confirm | null>(null);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => setSignedInEmail(data.session?.user.email ?? ''));
  }, []);

  const overview = useQuery({
    queryKey: ['cp', 'overview'],
    queryFn: cpAdmin.overview,
    retry: (count, error) => !(error instanceof ControlPlaneError && stopRetryOn.has(error.code)) && count < 2,
  });

  const sites = overview.data?.sites ?? [];
  const wanted = params.get('site');
  const site = sites.find((s) => s.slug === wanted) ?? sites.find((s) => s.status !== 'archived') ?? sites[0] ?? null;

  const detail = useQuery({
    queryKey: ['cp', 'site', site?.id],
    queryFn: () => cpAdmin.siteDetail(site!.id),
    enabled: Boolean(site),
  });
  const current = detail.data?.site ?? site;
  const members = detail.data?.members ?? [];

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['cp'] });

  const fail = (error: unknown, title = 'That did not work') =>
    toast({ variant: 'destructive', title, description: error instanceof Error ? error.message : String(error) });

  async function act<T>(key: string, run: () => Promise<T>, success?: (result: T) => void): Promise<boolean> {
    setBusy(key);
    try {
      const result = await run();
      success?.(result);
      await refresh();
      return true;
    } catch (error) {
      fail(error);
      return false;
    } finally {
      setBusy(null);
    }
  }

  const selectSite = (slug: string) => {
    const next = new URLSearchParams(params);
    next.set('site', slug);
    setParams(next, { replace: true });
  };

  const saveSite = (input: SiteInput) =>
    act('site', () => cpAdmin.saveSite(input), ({ site: saved }) => {
      toast({ title: input.id ? 'Site saved' : 'Site registered', description: saved.display_name });
      setSiteSheet({ open: false, site: null });
      selectSite(saved.slug);
    });

  const deleteSite = (target: ClientSite) =>
    act('site-delete', () => cpAdmin.deleteSite(target.id), () => {
      toast({ title: 'Site deleted', description: target.display_name });
      setSiteSheet({ open: false, site: null });
      setParams(new URLSearchParams(), { replace: true });
    });

  const submitMember = ({ input, method }: MemberSubmit) => {
    if (!current) return;
    const editing = memberSheet.member;
    if (editing) {
      return act('member', () => cpAdmin.updateMember(editing.id, input), () => {
        toast({ title: 'Access updated', description: input.full_name });
        setMemberSheet({ open: false, member: null });
      });
    }
    return act('member', () => cpAdmin.createMember(current.id, input, method), (credentials) => {
      setMemberSheet({ open: false, member: null });
      setIssued({ credentials, person: input, site: current, reason: 'added' });
    });
  };

  const reset = (member: SiteMember, method: 'invite' | 'password') =>
    act(`reset-${member.id}`, () => cpAdmin.resetMember(member.id, method), (credentials) =>
      setIssued({ credentials, person: member, site: current!, reason: 'reset' }),
    );

  const setStatus = (member: SiteMember, status: 'active' | 'suspended' | 'revoked') =>
    act(`status-${member.id}`, () => cpAdmin.setMemberStatus(member.id, status), () =>
      toast({
        title: status === 'active' ? 'Access restored' : status === 'suspended' ? 'Suspended and signed out' : 'Access revoked',
        description: member.full_name,
      }),
    );

  const openAsDeveloper = async (target: ClientSite) => {
    // Open the tab inside the click so the browser does not block it, then point it at the one-time link.
    const tab = window.open('', '_blank');
    if (tab) {
      tab.opener = null;
      tab.document.title = 'Opening…';
      tab.document.body.style.cssText = 'margin:0;padding:32px;font:15px system-ui,sans-serif;background:#0f1b33;color:#cbd5e1';
      tab.document.body.textContent = `Opening ${target.display_name} as developer…`;
    }
    setBusy(`dev-${target.id}`);
    try {
      const { url } = await cpAdmin.developerLink(target.id);
      if (tab) tab.location.href = url;
      else window.location.assign(url);
      void refresh();
    } catch (error) {
      tab?.close();
      fail(error, 'Could not open the site');
    } finally {
      setBusy(null);
    }
  };

  // ---------- states before the panel ----------
  if (overview.isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    );
  }
  if (overview.error instanceof ControlPlaneError && overview.error.code === 'setup_required') {
    return (
      <PageShell onRefresh={() => overview.refetch()} refreshing={overview.isFetching}>
        <SetupRequired onRetry={() => overview.refetch()} checking={overview.isFetching} />
      </PageShell>
    );
  }
  if (overview.error instanceof ControlPlaneError && overview.error.code === 'not_authorized') {
    return (
      <PageShell onRefresh={() => overview.refetch()} refreshing={overview.isFetching}>
        <NotPlatformAdmin email={signedInEmail} />
      </PageShell>
    );
  }
  if (overview.error) {
    return (
      <PageShell onRefresh={() => overview.refetch()} refreshing={overview.isFetching}>
        <div className="glass rounded-lg p-6 max-w-2xl">
          <h3 className="font-semibold">Could not load client sites</h3>
          <p className="text-sm text-muted-foreground mt-1">{(overview.error as Error).message}</p>
          <Button className="mt-4" variant="outline" onClick={() => overview.refetch()}>
            Try again
          </Button>
        </div>
      </PageShell>
    );
  }

  const me = overview.data!.me;

  return (
    <PageShell
      onRefresh={refresh}
      refreshing={overview.isFetching || detail.isFetching}
      actions={
        <Button onClick={() => setSiteSheet({ open: true, site: null })} className="bg-neon-cyan hover:bg-neon-cyan/80 text-black">
          <Plus className="w-4 h-4 mr-2" /> Add site
        </Button>
      }
    >
      <DeveloperCard
        me={me}
        sites={sites}
        saving={busy === 'dev-password'}
        onSetPassword={(password) =>
          act('dev-password', () => cpAdmin.setDeveloperPassword(password), () => toast({ title: 'Developer password saved' }))
        }
      />

      {sites.length === 0 ? (
        <div className="glass rounded-lg p-8 text-center">
          <h3 className="text-lg font-semibold">No client sites yet</h3>
          <p className="text-muted-foreground mt-1">Register the first website or ERP you built to start giving people access.</p>
          <Button className="mt-4 bg-neon-cyan hover:bg-neon-cyan/80 text-black" onClick={() => setSiteSheet({ open: true, site: null })}>
            <Plus className="w-4 h-4 mr-2" /> Add site
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)] gap-6 items-start">
          <SiteList sites={sites} selectedId={current?.id} onSelect={selectSite} />

          {current ? (
            <section className="glass rounded-lg p-4 sm:p-6 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-xl font-bold break-words">{current.display_name}</h3>
                    <SiteStatusBadge status={current.status} />
                  </div>
                  <p className="text-sm text-muted-foreground mt-1 break-all">
                    {current.business_name ? `${current.business_name} · ` : ''}
                    <a href={current.site_url} target="_blank" rel="noreferrer" className="hover:text-neon-cyan">
                      {current.site_url.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                    </a>
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 shrink-0">
                  <Button
                    onClick={() => openAsDeveloper(current)}
                    disabled={current.status !== 'active' || !current.developer_access || busy === `dev-${current.id}`}
                    title={current.status !== 'active' ? 'The site is not active' : !current.developer_access ? 'Developer access is off' : undefined}
                    className="bg-neon-cyan hover:bg-neon-cyan/80 text-black"
                  >
                    <ShieldCheck className="w-4 h-4 mr-2" />
                    {busy === `dev-${current.id}` ? 'Opening…' : 'Open as developer'}
                  </Button>
                  <Button variant="outline" onClick={() => setSiteSheet({ open: true, site: current })}>
                    <Settings2 className="w-4 h-4 mr-2" /> Settings
                  </Button>
                  <DropdownMenu modal={false}>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="icon" aria-label="More site actions">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <a href={current.site_url} target="_blank" rel="noreferrer">
                          <ExternalLink className="w-4 h-4 mr-2" /> Visit site
                        </a>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        disabled={!current.sessions_active}
                        onSelect={() =>
                          setConfirm({
                            title: `Sign everyone out of ${current.display_name}?`,
                            body: 'Everyone currently signed in, including you as developer, has to sign in again.',
                            label: 'Sign everyone out',
                            run: async () => {
                              await act('end-all', () => cpAdmin.endSessions(current.id), (r) =>
                                toast({ title: 'Signed everyone out', description: `${r.ended} session${r.ended === 1 ? '' : 's'} ended` }),
                              );
                            },
                          })
                        }
                      >
                        <LogOut className="w-4 h-4 mr-2" /> Sign everyone out
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
                <Stat label="People with access" value={current.members_active} />
                <Stat label="Invites waiting" value={current.members_invited} />
                <Stat label="Signed in now" value={current.sessions_active} />
                <Stat label="Last sign-in" value={timeAgo(current.last_login_at)} small />
              </dl>

              {current.status !== 'active' ? (
                <Notice tone="warn">
                  This site is {current.status}. Nobody can sign in until you make it active again in Settings.
                </Notice>
              ) : !current.has_owner ? (
                <Notice>
                  No owner yet. Add the business owner first: they get full access and can add their own staff from inside the site.
                </Notice>
              ) : null}

              <Tabs defaultValue="people" className="mt-5">
                <TabsList>
                  <TabsTrigger value="people">People</TabsTrigger>
                  <TabsTrigger value="activity">Activity</TabsTrigger>
                  <TabsTrigger value="connect">Connect a site</TabsTrigger>
                </TabsList>

                <TabsContent value="people" className="mt-4">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <p className="text-sm text-muted-foreground">
                      Owners and co-owners can also manage their team from inside the site.
                    </p>
                    <Button
                      size="sm"
                      onClick={() => setMemberSheet({ open: true, member: null })}
                      disabled={current.status === 'archived'}
                      className="bg-neon-cyan hover:bg-neon-cyan/80 text-black shrink-0"
                    >
                      <UserPlus className="w-4 h-4 mr-1.5" /> Add person
                    </Button>
                  </div>
                  {detail.isLoading ? (
                    <div className="flex justify-center py-10">
                      <Spinner className="h-8 w-8" />
                    </div>
                  ) : members.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-8 text-center">Nobody has access to this site yet.</p>
                  ) : (
                    <MemberList
                      site={current}
                      members={members}
                      busy={busy}
                      onEdit={(member) => setMemberSheet({ open: true, member })}
                      onReset={reset}
                      onStatus={setStatus}
                      onEndSessions={(member) =>
                        act(`end-${member.id}`, () => cpAdmin.endSessions(current.id, member.id), () =>
                          toast({ title: 'Signed out of all devices', description: member.full_name }),
                        )
                      }
                      onConfirm={setConfirm}
                      onDelete={(member) =>
                        act(`delete-${member.id}`, () => cpAdmin.deleteMember(member.id), () =>
                          toast({ title: 'Record deleted', description: member.full_name }),
                        )
                      }
                    />
                  )}
                </TabsContent>

                <TabsContent value="activity" className="mt-4">
                  {detail.isLoading ? (
                    <div className="flex justify-center py-10">
                      <Spinner className="h-8 w-8" />
                    </div>
                  ) : (
                    <ActivityFeed entries={detail.data?.activity ?? []} myEmail={me.email} />
                  )}
                </TabsContent>

                <TabsContent value="connect" className="mt-4">
                  <IntegrationPanel site={current} />
                </TabsContent>
              </Tabs>
            </section>
          ) : null}
        </div>
      )}

      <SiteSheet
        open={siteSheet.open}
        site={siteSheet.site}
        saving={busy === 'site'}
        deleting={busy === 'site-delete'}
        onClose={() => setSiteSheet({ open: false, site: null })}
        onSave={saveSite}
        onDelete={deleteSite}
      />
      {current ? (
        <MemberSheet
          open={memberSheet.open}
          site={current}
          member={memberSheet.member}
          saving={busy === 'member'}
          onClose={() => setMemberSheet({ open: false, member: null })}
          onSubmit={submitMember}
        />
      ) : null}
      <CredentialsDialog issued={issued} onClose={() => setIssued(null)} />
      <AlertDialog open={Boolean(confirm)} onOpenChange={(open) => (!open ? setConfirm(null) : undefined)}>
        {confirm ? (
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{confirm.title}</AlertDialogTitle>
              <AlertDialogDescription>{confirm.body}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className={confirm.danger ? 'bg-rose-600 hover:bg-rose-500 text-white' : 'bg-neon-cyan hover:bg-neon-cyan/80 text-black'}
                onClick={() => void confirm.run()}
              >
                {confirm.label}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        ) : null}
      </AlertDialog>
    </PageShell>
  );
}

function PageShell({
  children,
  actions,
  onRefresh,
  refreshing,
}: {
  children: ReactNode;
  actions?: ReactNode;
  onRefresh: () => void;
  refreshing: boolean;
}) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Client Sites & Access</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Give each business you build a site for its own sign-in: owners, co-owners and staff, with access to just the parts they need.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" onClick={onRefresh} disabled={refreshing} aria-label="Refresh">
            <RefreshCw className={cn('w-4 h-4', refreshing && 'animate-spin')} />
          </Button>
          {actions}
        </div>
      </div>
      {children}
    </div>
  );
}

function Stat({ label, value, small }: { label: string; value: ReactNode; small?: boolean }) {
  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900/30 px-3 py-2">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={cn('font-semibold mt-0.5', small ? 'text-sm' : 'text-lg')}>{value}</dd>
    </div>
  );
}

function Notice({ children, tone }: { children: ReactNode; tone?: 'warn' }) {
  return (
    <p
      className={cn(
        'mt-4 text-sm rounded-lg border px-3 py-2',
        tone === 'warn' ? 'border-amber-500/30 bg-amber-500/10 text-amber-200' : 'border-sky-500/30 bg-sky-500/10 text-sky-200',
      )}
    >
      {children}
    </p>
  );
}

function SiteList({ sites, selectedId, onSelect }: { sites: ClientSite[]; selectedId?: string; onSelect: (slug: string) => void }) {
  return (
    <nav aria-label="Client sites" className="flex lg:flex-col gap-2 overflow-x-auto pb-1 lg:pb-0 -mx-1 px-1 lg:mx-0 lg:px-0">
      {sites.map((s) => (
        <button
          key={s.id}
          type="button"
          onClick={() => onSelect(s.slug)}
          aria-current={s.id === selectedId ? 'true' : undefined}
          className={cn(
            'glass rounded-lg p-3 text-left border transition-colors shrink-0 w-56 lg:w-auto',
            s.id === selectedId ? 'border-neon-cyan' : 'border-transparent hover:border-gray-600',
            s.status === 'archived' && 'opacity-60',
          )}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="font-semibold truncate">{s.display_name}</span>
            {s.status !== 'active' ? <SiteStatusBadge status={s.status} /> : null}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {s.members_active} with access
            {s.members_invited ? ` · ${s.members_invited} invited` : ''}
            {s.sessions_active ? ` · ${s.sessions_active} online` : ''}
          </div>
        </button>
      ))}
    </nav>
  );
}

function MemberList({
  site,
  members,
  busy,
  onEdit,
  onReset,
  onStatus,
  onEndSessions,
  onConfirm,
  onDelete,
}: {
  site: ClientSite;
  members: SiteMember[];
  busy: string | null;
  onEdit: (member: SiteMember) => void;
  onReset: (member: SiteMember, method: 'invite' | 'password') => void;
  onStatus: (member: SiteMember, status: 'active' | 'suspended' | 'revoked') => void;
  onEndSessions: (member: SiteMember) => void;
  onConfirm: (confirm: Confirm) => void;
  onDelete: (member: SiteMember) => Promise<boolean>;
}) {
  const actions = (member: SiteMember) => {
    const revoked = member.status === 'revoked';
    const working = Boolean(busy && busy.endsWith(member.id));
    return (
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label={`Actions for ${member.full_name}`} disabled={working}>
            {working ? <RefreshCw className="w-4 h-4 animate-spin" /> : <MoreHorizontal className="w-4 h-4" />}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="truncate">{member.full_name}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {!revoked ? (
            <DropdownMenuItem onSelect={() => onEdit(member)}>
              <Pencil className="w-4 h-4 mr-2" /> Edit access
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuItem onSelect={() => onReset(member, 'invite')} disabled={site.status === 'archived'}>
            <Link2 className="w-4 h-4 mr-2" /> {revoked ? 'Give access again (invite link)' : 'Send a new invite link'}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => onReset(member, 'password')} disabled={site.status === 'archived'}>
            <KeyRound className="w-4 h-4 mr-2" /> {revoked ? 'Give access again (password)' : 'Give a temporary password'}
          </DropdownMenuItem>
          {member.sessions_active > 0 ? (
            <DropdownMenuItem onSelect={() => onEndSessions(member)}>
              <LogOut className="w-4 h-4 mr-2" /> Sign out of all devices
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuSeparator />
          {member.status === 'suspended' ? (
            <DropdownMenuItem onSelect={() => onStatus(member, 'active')}>
              <RotateCcw className="w-4 h-4 mr-2" /> Restore access
            </DropdownMenuItem>
          ) : !revoked ? (
            <DropdownMenuItem onSelect={() => onStatus(member, 'suspended')}>
              <Ban className="w-4 h-4 mr-2" /> Suspend
            </DropdownMenuItem>
          ) : null}
          {!revoked ? (
            <DropdownMenuItem
              className="text-rose-300 focus:text-rose-200"
              onSelect={() =>
                onConfirm({
                  title: `Revoke ${member.full_name}'s access?`,
                  body: `They are signed out of ${site.display_name} straight away and their password stops working. You can give them access again later.`,
                  label: 'Revoke access',
                  danger: true,
                  run: async () => onStatus(member, 'revoked'),
                })
              }
            >
              <UserX className="w-4 h-4 mr-2" /> Revoke access
            </DropdownMenuItem>
          ) : null}
          {revoked || member.status === 'invited' ? (
            <DropdownMenuItem
              className="text-rose-300 focus:text-rose-200"
              onSelect={() =>
                onConfirm({
                  title: `Delete ${member.full_name}'s record?`,
                  body: 'The person is removed from this list. The activity history keeps what happened.',
                  label: 'Delete record',
                  danger: true,
                  run: async () => {
                    await onDelete(member);
                  },
                })
              }
            >
              <Trash2 className="w-4 h-4 mr-2" /> Delete record
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  const subline = (member: SiteMember) => {
    if (member.status === 'invited') return member.invite_expires_at ? `Invite valid until ${formatDate(member.invite_expires_at)}` : 'Invite not sent';
    if (member.locked_until) return `Locked after failed sign-ins until ${formatDateTime(member.locked_until)}`;
    if (member.access_expires_at) return `Access until ${formatDate(member.access_expires_at)}`;
    return member.last_login_at ? `Last sign-in ${timeAgo(member.last_login_at)}` : 'Has not signed in yet';
  };

  const scope = (member: SiteMember) =>
    member.project_scope.includes('all') ? null : member.project_scope.length ? `${member.project_scope.length} project${member.project_scope.length === 1 ? '' : 's'} only` : 'No projects';

  return (
    <>
      {/* phones */}
      <ul className="space-y-2 md:hidden">
        {members.map((member) => (
          <li key={member.id} className={cn('rounded-lg border border-gray-800 p-3', member.status === 'revoked' && 'opacity-60')}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium break-words">{member.full_name}</span>
                  <RoleBadge role={member.role} />
                </div>
                <div className="text-xs text-muted-foreground break-all mt-0.5">
                  {member.email}
                  {member.phone ? ` · ${member.phone}` : ''}
                </div>
              </div>
              {actions(member)}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <MemberStatusBadge member={member} />
              <span className="text-xs text-muted-foreground">{subline(member)}</span>
            </div>
            <p className="text-xs mt-2 text-gray-300">
              {describeRights(member, site.modules)}
              {scope(member) ? ` · ${scope(member)}` : ''}
            </p>
          </li>
        ))}
      </ul>

      {/* tablets and up */}
      <div className="hidden md:block rounded-lg border border-gray-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-900/40 text-xs text-muted-foreground">
            <tr>
              <th className="text-left font-medium px-3 py-2">Person</th>
              <th className="text-left font-medium px-3 py-2">Role</th>
              <th className="text-left font-medium px-3 py-2">Can use</th>
              <th className="text-left font-medium px-3 py-2">Status</th>
              <th className="px-3 py-2">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {members.map((member) => (
              <tr key={member.id} className={cn('align-top', member.status === 'revoked' && 'opacity-60')}>
                <td className="px-3 py-2.5 max-w-[16rem]">
                  <div className="font-medium break-words">{member.full_name}</div>
                  <div className="text-xs text-muted-foreground break-all">{member.email}</div>
                  {member.phone ? <div className="text-xs text-muted-foreground">{member.phone}</div> : null}
                </td>
                <td className="px-3 py-2.5">
                  <RoleBadge role={member.role} />
                </td>
                <td className="px-3 py-2.5 text-gray-300 max-w-[18rem]">
                  {describeRights(member, site.modules)}
                  {scope(member) ? <div className="text-xs text-muted-foreground">{scope(member)}</div> : null}
                </td>
                <td className="px-3 py-2.5">
                  <MemberStatusBadge member={member} />
                  <div className="text-xs text-muted-foreground mt-1">{subline(member)}</div>
                </td>
                <td className="px-2 py-1.5 text-right">{actions(member)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
