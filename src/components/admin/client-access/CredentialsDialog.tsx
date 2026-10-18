import { KeyRound, Link2, Mail, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ClientSite, credentialMessage, Credentials, formatDateTime, MemberRole, whatsappLink } from '@/lib/controlPlane';
import { CopyButton } from './shared';

export type IssuedCredentials = {
  credentials: Credentials;
  person: { full_name: string; email: string; phone: string; role: MemberRole };
  site: ClientSite;
  reason: 'added' | 'reset';
};

export function CredentialsDialog({ issued, onClose }: { issued: IssuedCredentials | null; onClose: () => void }) {
  if (!issued) return null;
  const { credentials, person, site, reason } = issued;
  const message = credentialMessage(credentials, person, site);
  const isInvite = credentials.method === 'invite';
  const subject = `Your access to ${site.display_name}`;

  return (
    <Dialog open onOpenChange={(next) => (!next ? onClose() : undefined)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isInvite ? <Link2 className="w-5 h-5 text-neon-cyan" /> : <KeyRound className="w-5 h-5 text-neon-cyan" />}
            {reason === 'added' ? `${person.full_name} was added` : `New ${isInvite ? 'invite link' : 'temporary password'} for ${person.full_name}`}
          </DialogTitle>
          <DialogDescription>
            {isInvite
              ? `Send this link to ${person.full_name.split(' ')[0]}. They open it, choose a password and are signed in.`
              : `Give ${person.full_name.split(' ')[0]} this password. They'll choose their own after the first sign-in.`}{' '}
            It is shown only this once. If it gets lost, send a new one.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {credentials.method === 'invite' ? (
            <div>
              <div className="text-xs text-muted-foreground mb-1">Invite link · valid until {formatDateTime(credentials.invite_expires_at)}</div>
              <div className="flex gap-2">
                <input readOnly value={credentials.invite_url} className="flex-1 min-w-0 px-3 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-sm font-mono" onFocus={(e) => e.currentTarget.select()} />
                <CopyButton text={credentials.invite_url} />
              </div>
            </div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <div className="text-xs text-muted-foreground mb-1">Sign in with</div>
                <div className="px-3 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-sm break-all">{person.email}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Temporary password</div>
                <div className="flex gap-2">
                  <div className="flex-1 px-3 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-sm font-mono tracking-wide">{credentials.temporary_password}</div>
                  <CopyButton text={credentials.temporary_password} label="" className="px-2.5" />
                </div>
              </div>
              <div className="sm:col-span-2 text-xs text-muted-foreground">Sign-in page: {credentials.login_url}</div>
            </div>
          )}

          <div>
            <div className="text-xs text-muted-foreground mb-1">Message to send</div>
            <pre className="text-sm whitespace-pre-wrap break-words bg-gray-900/50 border border-gray-700 rounded-lg p-3 max-h-48 overflow-y-auto">{message}</pre>
          </div>
        </div>

        <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-between">
          <Button type="button" variant="ghost" onClick={onClose}>
            Done
          </Button>
          <div className="flex flex-wrap gap-2 justify-end">
            <CopyButton text={message} label="Copy message" />
            <Button asChild variant="outline" size="sm">
              <a href={whatsappLink(person.phone, message)} target="_blank" rel="noreferrer">
                <MessageCircle className="w-4 h-4 mr-1.5" /> WhatsApp
              </a>
            </Button>
            <Button asChild variant="outline" size="sm">
              <a href={`mailto:${encodeURIComponent(person.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`}>
                <Mail className="w-4 h-4 mr-1.5" /> Email
              </a>
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
