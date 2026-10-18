import { ExternalLink } from 'lucide-react';
import { ClientSite, SUPABASE_PROJECT_REF } from '@/lib/controlPlane';
import { CopyButton } from './shared';

const GUIDE_URL = 'https://github.com/indra9346/My__Website-/blob/main/control-plane/README.md';

function Snippet({ code }: { code: string }) {
  return (
    <div className="relative">
      <pre className="text-xs bg-gray-900/60 border border-gray-700 rounded-lg p-3 pr-20 overflow-x-auto whitespace-pre">{code}</pre>
      <div className="absolute top-2 right-2">
        <CopyButton text={code} label="Copy" />
      </div>
    </div>
  );
}

export function IntegrationPanel({ site }: { site: ClientSite }) {
  const firstModule = site.modules[0]?.key ?? 'bookings';
  const signIn = `import { createControlPlane } from './cp-client';

export const cp = createControlPlane({
  supabaseUrl: 'https://${SUPABASE_PROJECT_REF}.supabase.co',
  anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
  site: '${site.slug}',
});

// On the sign-in page: accepts invite and developer links (?cp_invite / ?cp_handoff)
const link = await cp.handleLink();     // { kind: 'invite', invite } | { kind: 'signed_in', ... } | null
const session = await cp.restore();     // signed in already?
const result = await cp.signIn(emailOrPhone, password);

if (cp.can('${firstModule}', 'write')) { /* show the edit buttons */ }`;

  const policy = `-- Let signed-in people with the right access change rows from the browser
create policy "${site.slug}: edit ${firstModule}" on public.your_table
  for update to anon
  using ((select public.cp_can('${site.slug}', '${firstModule}', 'write')));`;

  return (
    <div className="space-y-5 text-sm">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-gray-700 p-3">
          <div className="text-xs text-muted-foreground">Site ID</div>
          <div className="flex items-center justify-between gap-2 mt-0.5">
            <code className="font-mono text-neon-cyan break-all">{site.slug}</code>
            <CopyButton text={site.slug} label="Copy" />
          </div>
        </div>
        <div className="rounded-lg border border-gray-700 p-3">
          <div className="text-xs text-muted-foreground">Invite and developer links open</div>
          <div className="mt-0.5 break-all">{site.login_url || site.site_url}</div>
        </div>
      </div>

      <ol className="space-y-4 list-decimal pl-5">
        <li>
          Copy <code className="text-neon-cyan">control-plane/cp-client.ts</code> from the portfolio repo into the site. It has no
          dependencies.
        </li>
        <li className="space-y-2">
          <span>Sign people in with it, and read their rights:</span>
          <Snippet code={signIn} />
        </li>
        <li>
          On the sign-in page, handle the <code>cp_invite</code> and <code>cp_handoff</code> links so invites and “Open as developer”
          work.
        </li>
        <li className="space-y-2">
          <span>
            Protect the site's own tables. The SDK sends the session as an <code>x-cp-session</code> header, and{' '}
            <code>cp_can()</code> checks it inside row level security:
          </span>
          <Snippet code={policy} />
        </li>
      </ol>

      <a href={GUIDE_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-neon-cyan hover:underline">
        Full integration guide <ExternalLink className="w-3.5 h-3.5" />
      </a>
    </div>
  );
}
