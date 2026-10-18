import { useState } from 'react';
import { Database, ExternalLink, RefreshCw, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { copyText, SUPABASE_SQL_EDITOR_URL } from '@/lib/controlPlane';
import { CopyButton } from './shared';

export function SetupRequired({ onRetry, checking }: { onRetry: () => void; checking: boolean }) {
  const [copied, setCopied] = useState<'idle' | 'loading' | 'done' | 'failed'>('idle');

  const copySql = async () => {
    setCopied('loading');
    try {
      // Loaded on demand so the SQL never ships with the rest of the admin.
      const { default: sql } = await import('../../../../supabase/migrations/20261018170000_client_access_control_plane.sql?raw');
      setCopied((await copyText(sql)) ? 'done' : 'failed');
    } catch {
      setCopied('failed');
    }
  };

  return (
    <div className="glass rounded-lg p-6 sm:p-8 max-w-3xl">
      <div className="flex items-start gap-4">
        <Database className="w-8 h-8 text-neon-cyan shrink-0 mt-1" />
        <div className="space-y-4 min-w-0">
          <div>
            <h3 className="text-xl font-bold">One-time setup in Supabase</h3>
            <p className="text-muted-foreground mt-1">
              The client access tables don't exist in your Supabase project yet, so there is nothing to show. Run the setup SQL once and
              this page starts working, for KBK Film Studios and every site you add later.
            </p>
          </div>
          <ol className="space-y-3 text-sm">
            <li className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-neon-cyan/15 text-neon-cyan flex items-center justify-center text-xs font-bold shrink-0">1</span>
              <div className="flex flex-wrap items-center gap-2">
                <span>Copy the setup SQL</span>
                <Button type="button" size="sm" variant="outline" onClick={copySql} disabled={copied === 'loading'}>
                  {copied === 'done' ? 'Copied' : copied === 'loading' ? 'Preparing…' : 'Copy setup SQL'}
                </Button>
                {copied === 'failed' ? (
                  <span className="text-rose-300">Couldn't copy. Open supabase/migrations/20261018170000_client_access_control_plane.sql instead.</span>
                ) : null}
              </div>
            </li>
            <li className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-neon-cyan/15 text-neon-cyan flex items-center justify-center text-xs font-bold shrink-0">2</span>
              <div className="flex flex-wrap items-center gap-2">
                <span>Paste it into the SQL editor and press Run</span>
                <Button asChild size="sm" variant="outline">
                  <a href={SUPABASE_SQL_EDITOR_URL} target="_blank" rel="noreferrer">
                    Open SQL editor <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
                  </a>
                </Button>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-neon-cyan/15 text-neon-cyan flex items-center justify-center text-xs font-bold shrink-0">3</span>
              <div className="flex flex-wrap items-center gap-2">
                <span>Come back and check again</span>
                <Button type="button" size="sm" className="bg-neon-cyan hover:bg-neon-cyan/80 text-black" onClick={onRetry} disabled={checking}>
                  <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${checking ? 'animate-spin' : ''}`} /> Check again
                </Button>
              </div>
            </li>
          </ol>
          <p className="text-xs text-muted-foreground">
            It only adds the client_sites, client_site_access and cp_* tables and functions. The tables your other apps use in this
            project are not touched, and running it twice is safe.
          </p>
        </div>
      </div>
    </div>
  );
}

export function NotPlatformAdmin({ email }: { email: string }) {
  const sql = `insert into public.cp_platform_admins (user_id, email)
select id, lower(email) from auth.users where lower(email) = '${email.toLowerCase().replace(/'/g, "''")}'
on conflict (user_id) do nothing;`;
  return (
    <div className="glass rounded-lg p-6 sm:p-8 max-w-3xl">
      <div className="flex items-start gap-4">
        <ShieldAlert className="w-8 h-8 text-amber-300 shrink-0 mt-1" />
        <div className="space-y-4 min-w-0">
          <div>
            <h3 className="text-xl font-bold">This account can't manage client access</h3>
            <p className="text-muted-foreground mt-1">
              You're signed in as <span className="text-foreground">{email}</span>, which isn't a platform admin. Only platform admins
              can see client sites and give people access. If this is your own account, add it once from the Supabase SQL editor:
            </p>
          </div>
          <pre className="text-xs bg-gray-900/60 border border-gray-700 rounded-lg p-3 overflow-x-auto whitespace-pre">{sql}</pre>
          <div className="flex flex-wrap gap-2">
            <CopyButton text={sql} label="Copy SQL" />
            <Button asChild size="sm" variant="outline">
              <a href={SUPABASE_SQL_EDITOR_URL} target="_blank" rel="noreferrer">
                Open SQL editor <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
              </a>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
