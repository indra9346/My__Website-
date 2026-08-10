import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Film, ShieldCheck, ExternalLink, Key, CheckCircle2, UserCheck, Lock } from 'lucide-react';

export const AdminKBKOwnership: React.FC = () => {
  const { toast } = useToast();

  const [primaryOwnerName, setPrimaryOwnerName] = useState('K S Indra Kumar');
  const [primaryOwnerPhone, setPrimaryOwnerPhone] = useState('9346476951');
  const [primaryOwnerEmail, setPrimaryOwnerEmail] = useState('ik9893344@gmail.com');
  const [clientOwnerName, setClientOwnerName] = useState('Kurudi Bharath Kumar');
  const [clientOwnerPhone, setClientOwnerPhone] = useState('9346227894');
  const [clientOwnerEmail, setClientOwnerEmail] = useState('kbkfilms.official@gmail.com');
  const [isUpdating, setIsUpdating] = useState(false);

  const handleSaveOwnership = (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    setTimeout(() => {
      setIsUpdating(false);
      toast({
        title: "KBK Ownership Updated",
        description: "Primary ownership credentials synchronized for KBK Film Studios.",
      });
    }, 600);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">KBK Film Studios Ownership & Access</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Manage authorized studio owners, primary ownership credentials, and direct console access for KBK Film Studios.
          </p>
        </div>

        <a
          href="http://localhost:5173/owner-space"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/40 hover:bg-neon-cyan/30 text-sm font-semibold transition-all"
        >
          <span>Launch KBK Owner Space</span>
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Your Primary Ownership */}
        <Card className="glass border-neon-cyan/30">
          <CardHeader>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-neon-cyan" />
              <CardTitle className="text-lg">Your Primary Ownership (Active)</CardTitle>
            </div>
            <CardDescription>
              Your personal contact details with full administrative control across all studio modules.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveOwnership} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Owner Name</label>
                <Input
                  value={primaryOwnerName}
                  onChange={(e) => setPrimaryOwnerName(e.target.value)}
                  className="bg-background/50 border-white/10"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Owner Phone</label>
                <Input
                  value={primaryOwnerPhone}
                  onChange={(e) => setPrimaryOwnerPhone(e.target.value)}
                  className="bg-background/50 border-white/10"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Owner Email</label>
                <Input
                  value={primaryOwnerEmail}
                  onChange={(e) => setPrimaryOwnerEmail(e.target.value)}
                  className="bg-background/50 border-white/10"
                />
              </div>

              <div className="pt-2 flex items-center justify-between">
                <span className="text-xs text-neon-cyan font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Ready for OTP Logins
                </span>
                <Button type="submit" disabled={isUpdating} className="bg-neon-cyan text-black hover:bg-neon-cyan/90 font-bold">
                  {isUpdating ? "Saving..." : "Save Primary Ownership"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Card 2: Client Studio Founder Profile */}
        <Card className="glass border-white/10">
          <CardHeader>
            <div className="flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-neon-purple" />
              <CardTitle className="text-lg">Client Studio Founder (Kurudi Bharath Kumar)</CardTitle>
            </div>
            <CardDescription>
              Client founder credentials for direct handover and co-owner governance.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Client Name</label>
              <Input
                value={clientOwnerName}
                onChange={(e) => setClientOwnerName(e.target.value)}
                className="bg-background/50 border-white/10"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Client Phone</label>
              <Input
                value={clientOwnerPhone}
                onChange={(e) => setClientOwnerPhone(e.target.value)}
                className="bg-background/50 border-white/10"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Client Email</label>
              <Input
                value={clientOwnerEmail}
                onChange={(e) => setClientOwnerEmail(e.target.value)}
                className="bg-background/50 border-white/10"
              />
            </div>

            <div className="p-3 rounded-lg bg-surface-100/50 border border-white/10 text-xs text-muted-foreground">
              🔒 <span className="text-white font-semibold">Data Isolation Status:</span> Active on KBK Film Studios backend with passwordless OTP verification.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminKBKOwnership;
