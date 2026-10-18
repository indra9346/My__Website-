import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
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
import { ClientSite, moduleKey, SiteInput, SiteModule, SiteStatus, suggestSlug } from '@/lib/controlPlane';
import { Field, inputClass } from './shared';

const MODULE_PRESETS = ['Bookings', 'Orders', 'Customers', 'Inventory', 'Billing', 'Payments', 'Reports', 'Staff', 'Website content', 'Settings'];

type Draft = Omit<SiteInput, 'modules'> & { modules: (SiteModule & { saved: boolean })[] };

function toDraft(site: ClientSite | null): Draft {
  return {
    id: site?.id,
    display_name: site?.display_name ?? '',
    business_name: site?.business_name ?? '',
    slug: site?.slug ?? '',
    site_url: site?.site_url ?? 'https://',
    login_url: site?.login_url ?? '',
    api_base_url: site?.api_base_url ?? '',
    status: site?.status ?? 'active',
    notes: site?.notes ?? '',
    modules: (site?.modules ?? []).map((m) => ({ ...m, saved: true })),
    developer_access: site?.developer_access ?? true,
    session_hours: site?.session_hours ?? 12,
  };
}

export function SiteSheet({
  open,
  site,
  saving,
  deleting,
  onClose,
  onSave,
  onDelete,
}: {
  open: boolean;
  site: ClientSite | null;
  saving: boolean;
  deleting: boolean;
  onClose: () => void;
  onSave: (input: SiteInput) => void;
  onDelete: (site: ClientSite) => void;
}) {
  const [draft, setDraft] = useState<Draft>(() => toDraft(site));
  const [slugTouched, setSlugTouched] = useState(false);
  const [newModule, setNewModule] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const isNew = !site;

  useEffect(() => {
    if (open) {
      setDraft(toDraft(site));
      setSlugTouched(false);
      setNewModule('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, site?.id]);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => ({ ...d, [key]: value }));
  const keys = useMemo(() => new Set(draft.modules.map((m) => m.key)), [draft.modules]);

  const addModule = (label: string) => {
    const clean = label.trim();
    const key = moduleKey(clean);
    if (!clean || !key || keys.has(key)) return;
    set('modules', [...draft.modules, { key, label: clean.slice(0, 40), saved: false }]);
    setNewModule('');
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSave({
      ...draft,
      slug: draft.slug.trim(),
      login_url: draft.login_url.trim(),
      api_base_url: draft.api_base_url.trim(),
      modules: draft.modules.map(({ key, label }) => ({ key, label: label.trim() })),
    });
  };

  return (
    <Sheet open={open} onOpenChange={(next) => (!next ? onClose() : undefined)}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isNew ? 'Register a client site' : `Site settings · ${site.display_name}`}</SheetTitle>
          <SheetDescription>
            {isNew
              ? 'Add a website or ERP you built so you can give its owner and staff their own sign-in.'
              : 'Changes apply to the next sign-in or session check on the site.'}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={submit} className="space-y-4 mt-6">
          <Field label="Site name" htmlFor="site-name">
            <input
              id="site-name"
              className={inputClass}
              value={draft.display_name}
              required
              maxLength={120}
              onChange={(e) => {
                const value = e.target.value;
                setDraft((d) => ({ ...d, display_name: value, slug: isNew && !slugTouched ? suggestSlug(value) : d.slug }));
              }}
              placeholder="KBK Film Studios"
            />
          </Field>
          <Field label="Business name" hint="Shown to people when they are invited." htmlFor="site-business">
            <input id="site-business" className={inputClass} value={draft.business_name} maxLength={160} onChange={(e) => set('business_name', e.target.value)} placeholder="KBK Films" />
          </Field>
          <Field
            label="Site ID"
            htmlFor="site-slug"
            hint={isNew ? 'The site uses this ID when it signs people in. It cannot be changed later.' : 'Fixed. The site uses it to sign people in.'}
          >
            <input
              id="site-slug"
              className={`${inputClass} font-mono`}
              value={draft.slug}
              disabled={!isNew}
              required
              pattern="[a-z0-9][a-z0-9-]{1,47}"
              onChange={(e) => {
                setSlugTouched(true);
                set('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'));
              }}
              placeholder="kbk-film-studios"
            />
          </Field>
          <Field label="Site address" htmlFor="site-url">
            <input id="site-url" type="url" className={inputClass} value={draft.site_url} required onChange={(e) => set('site_url', e.target.value)} placeholder="https://example.com" />
          </Field>
          <Field
            label="Sign-in page"
            htmlFor="site-login"
            hint="Invite links and “Open as developer” land here. Leave empty to use the site address."
          >
            <input id="site-login" type="url" className={inputClass} value={draft.login_url} onChange={(e) => set('login_url', e.target.value)} placeholder="https://example.com/owner" />
          </Field>
          <Field label="API address (optional)" htmlFor="site-api">
            <input id="site-api" type="url" className={inputClass} value={draft.api_base_url} onChange={(e) => set('api_base_url', e.target.value)} placeholder="https://example.com/api" />
          </Field>

          <div>
            <div className="mb-1.5 text-sm font-medium">Modules</div>
            <p className="text-xs text-muted-foreground mb-2">The parts of the ERP you can give access to, one by one. Owners and co-owners always get all of them.</p>
            <div className="space-y-2">
              {draft.modules.map((m, index) => (
                <div key={m.key} className="flex items-center gap-2">
                  <input
                    className={`${inputClass} py-1.5`}
                    value={m.label}
                    maxLength={40}
                    aria-label={`Module ${index + 1} name`}
                    onChange={(e) => set('modules', draft.modules.map((x, i) => (i === index ? { ...x, label: e.target.value } : x)))}
                  />
                  <code className="hidden sm:block text-xs text-muted-foreground w-32 truncate" title={m.key}>
                    {m.key}
                  </code>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="shrink-0"
                    aria-label={`Remove ${m.label}`}
                    onClick={() => set('modules', draft.modules.filter((_, i) => i !== index))}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              {(site?.modules ?? []).some((m) => !keys.has(m.key)) ? (
                <p className="text-xs text-amber-300">People lose access to modules you remove.</p>
              ) : null}
              <div className="flex gap-2">
                <input
                  className={`${inputClass} py-1.5`}
                  value={newModule}
                  placeholder="Add a module, e.g. Billing"
                  onChange={(e) => setNewModule(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addModule(newModule);
                    }
                  }}
                />
                <Button type="button" variant="outline" size="sm" className="shrink-0 h-auto" onClick={() => addModule(newModule)} disabled={!moduleKey(newModule) || keys.has(moduleKey(newModule))}>
                  <Plus className="w-4 h-4 mr-1" /> Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {MODULE_PRESETS.filter((p) => !keys.has(moduleKey(p))).map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    className="text-xs px-2 py-1 rounded-full border border-gray-700 text-muted-foreground hover:border-neon-cyan hover:text-neon-cyan transition-colors"
                    onClick={() => addModule(preset)}
                  >
                    + {preset}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Sign out after idle (hours)" htmlFor="site-hours" hint="1 to 720 hours.">
              <input
                id="site-hours"
                type="number"
                min={1}
                max={720}
                className={inputClass}
                value={draft.session_hours}
                onChange={(e) => set('session_hours', Math.max(1, Math.min(720, Number(e.target.value) || 1)))}
              />
            </Field>
            {!isNew ? (
              <Field label="Status" htmlFor="site-status" hint={draft.status === 'active' ? 'People can sign in.' : 'Nobody can sign in; everyone is signed out.'}>
                <select id="site-status" className={inputClass} value={draft.status} onChange={(e) => set('status', e.target.value as SiteStatus)}>
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                  <option value="archived">Archived</option>
                </select>
              </Field>
            ) : null}
          </div>

          <div className="flex items-start justify-between gap-4 rounded-lg border border-gray-700 p-3">
            <div>
              <div className="text-sm font-medium">Developer access</div>
              <p className="text-xs text-muted-foreground mt-0.5">
                You can open this site with full rights at any time. Switch it off only if the client asks you not to have access.
              </p>
            </div>
            <Switch checked={draft.developer_access} onCheckedChange={(v) => set('developer_access', v)} aria-label="Developer access" />
          </div>

          <Field label="Notes (only you see these)" htmlFor="site-notes">
            <textarea id="site-notes" rows={3} className={inputClass} value={draft.notes} maxLength={2000} onChange={(e) => set('notes', e.target.value)} />
          </Field>

          <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
            {!isNew ? (
              <Button
                type="button"
                variant="ghost"
                className="text-rose-300 hover:text-rose-200 justify-start"
                disabled={site.status !== 'archived' || deleting}
                title={site.status !== 'archived' ? 'Archive the site first' : undefined}
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 className="w-4 h-4 mr-1.5" /> Delete site
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-3 justify-end">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" className="bg-neon-cyan hover:bg-neon-cyan/80 text-black" disabled={saving}>
                {saving ? 'Saving…' : isNew ? 'Register site' : 'Save changes'}
              </Button>
            </div>
          </div>
        </form>

        {!isNew ? (
          <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete {site.display_name}?</AlertDialogTitle>
                <AlertDialogDescription>
                  Everyone's access to this site is removed and they are signed out. The website itself is not affected. This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Keep it</AlertDialogCancel>
                <AlertDialogAction className="bg-rose-600 hover:bg-rose-500 text-white" onClick={() => onDelete(site)}>
                  Delete site
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
