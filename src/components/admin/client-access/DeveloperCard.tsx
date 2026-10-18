import { FormEvent, useState } from 'react';
import { KeyRound, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AdminMe, ClientSite } from '@/lib/controlPlane';
import { Field, inputClass } from './shared';

export function DeveloperCard({
  me,
  sites,
  saving,
  onSetPassword,
}: {
  me: AdminMe;
  sites: ClientSite[];
  saving: boolean;
  onSetPassword: (password: string) => Promise<boolean>;
}) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [problem, setProblem] = useState('');
  const live = sites.filter((s) => s.status === 'active');
  const off = live.filter((s) => !s.developer_access);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (password.length < 10) return setProblem('Use at least 10 characters.');
    if (password !== confirm) return setProblem('The two passwords are different.');
    setProblem('');
    if (await onSetPassword(password)) {
      setOpen(false);
      setPassword('');
      setConfirm('');
    }
  };

  return (
    <div className="glass rounded-lg p-4 sm:p-5 flex flex-col md:flex-row md:items-center gap-4">
      <ShieldCheck className="w-8 h-8 text-neon-cyan shrink-0 hidden sm:block" />
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold">Your developer access</h3>
        <p className="text-sm text-muted-foreground mt-0.5">
          You have full rights on {live.length === 1 ? 'the active site' : `all ${live.length} active sites`} without a client account
          {off.length ? ` (developer access is off for ${off.map((s) => s.display_name).join(', ')})` : ''}. Use “Open as developer” on a
          site, or sign in on any site's own sign-in page with <span className="text-foreground">{me.email}</span>
          {me.has_developer_password ? ' and your developer password.' : ' once you set a developer password.'}
        </p>
      </div>
      <Button type="button" variant="outline" className="shrink-0" onClick={() => setOpen(true)}>
        <KeyRound className="w-4 h-4 mr-2" />
        {me.has_developer_password ? 'Change developer password' : 'Set developer password'}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={submit}>
            <DialogHeader>
              <DialogTitle>{me.has_developer_password ? 'Change developer password' : 'Set a developer password'}</DialogTitle>
              <DialogDescription>
                Lets you sign in on any client site's own sign-in page as {me.email}. It is separate from your portfolio password.
                {me.has_developer_password ? ' Changing it signs you out of every client site.' : ''}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 my-5">
              <Field label="New password" htmlFor="dev-pw" hint="At least 10 characters.">
                <input id="dev-pw" type="password" autoComplete="new-password" className={inputClass} value={password} onChange={(e) => setPassword(e.target.value)} required minLength={10} />
              </Field>
              <Field label="Repeat it" htmlFor="dev-pw2">
                <input id="dev-pw2" type="password" autoComplete="new-password" className={inputClass} value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
              </Field>
              {problem ? <p className="text-sm text-rose-300">{problem}</p> : null}
            </div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-neon-cyan hover:bg-neon-cyan/80 text-black" disabled={saving}>
                {saving ? 'Saving…' : 'Save password'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
