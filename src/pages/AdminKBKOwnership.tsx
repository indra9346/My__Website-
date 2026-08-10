import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Film, ShieldCheck, ExternalLink, Key, CheckCircle2, UserCheck, Lock, Trash2, UserPlus, RefreshCw, AlertCircle } from 'lucide-react';

interface KBKOwner {
  id: string;
  name: string;
  phone: string;
  email: string;
  role: string;
  permissions: string[];
  isActive: boolean;
  createdAt: string;
}

export const AdminKBKOwnership: React.FC = () => {
  const { toast } = useToast();

  const API_BASE = 'http://localhost:5000/api';

  // Auth States
  const [token, setToken] = useState<string | null>(localStorage.getItem('kbk_portfolio_owner_token'));
  const [identifier, setIdentifier] = useState('9346476951');
  const [otpCode, setOtpCode] = useState('123456');
  const [otpSent, setOtpSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [demoHint, setDemoHint] = useState('');

  // Dashboard States
  const [owners, setOwners] = useState<KBKOwner[]>([]);
  const [newOwnerName, setNewOwnerName] = useState('');
  const [newOwnerPhone, setNewOwnerPhone] = useState('');
  const [newOwnerEmail, setNewOwnerEmail] = useState('');
  const [newOwnerRole, setNewOwnerRole] = useState('co_owner');
  const [isSyncing, setIsSyncing] = useState(false);

  // Fetch Owners from KBK Backend
  const fetchOwners = async (activeToken: string) => {
    try {
      setIsSyncing(true);
      const res = await fetch(`${API_BASE}/owner/owners`, {
        headers: {
          'Authorization': `Bearer ${activeToken}`
        }
      });
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          handleLogout();
          throw new Error('Authentication expired or unauthorized.');
        }
        throw new Error('Failed to retrieve owners list');
      }
      const data = await res.json();
      setOwners(data);
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "API Sync Failure",
        description: err.message || "Is the KBK Film Studios backend server running?",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchOwners(token);
    }
  }, [token]);

  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) return;
    setIsLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch(`${API_BASE}/auth/owner-request-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: identifier.trim() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send verification code');
      setOtpSent(true);
      setDemoHint(data.demoHint || 'Enter: 123456');
      toast({
        title: "Access Code Sent",
        description: "Verify using the 6-digit OTP code sent to your contact.",
      });
    } catch (err: any) {
      setErrorMsg(err.message || 'Connection failed. Is the KBK server online?');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode.trim()) return;
    setIsLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch(`${API_BASE}/auth/owner-verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: identifier.trim(), otpCode: otpCode.trim() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Invalid OTP access code');
      
      localStorage.setItem('kbk_portfolio_owner_token', data.token);
      setToken(data.token);
      toast({
        title: "Connection Established",
        description: `Successfully linked to KBK Film Studios as ${data.owner.name}`,
      });
    } catch (err: any) {
      setErrorMsg(err.message || 'OTP verification failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddOwner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !newOwnerName.trim() || !newOwnerPhone.trim() || !newOwnerEmail.trim()) return;
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/owner/owners`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: newOwnerName.trim(),
          phone: newOwnerPhone.trim(),
          email: newOwnerEmail.trim(),
          role: newOwnerRole
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add co-owner');
      
      toast({
        title: "Owner Added",
        description: `${newOwnerName} is now registered to KBK Film Studios.`,
      });
      setNewOwnerName('');
      setNewOwnerPhone('');
      setNewOwnerEmail('');
      fetchOwners(token);
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Failed to Add Owner",
        description: err.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveOwner = async (id: string, name: string) => {
    if (!token || !confirm(`Are you sure you want to revoke ownership access for ${name}?`)) return;
    try {
      const res = await fetch(`${API_BASE}/owner/owners/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to revoke ownership access');
      
      toast({
        title: "Access Revoked",
        description: `${name} has been removed from KBK Film Studios.`,
      });
      fetchOwners(token);
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Failed to Revoke Access",
        description: err.message,
      });
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('kbk_portfolio_owner_token');
    setToken(null);
    setOtpSent(false);
    setOwners([]);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">KBK Film Studios Studio Management Console</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Authorize and manage co-owners, change master credentials, and oversee client deliverables.
          </p>
        </div>

        {token && (
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchOwners(token)}
              disabled={isSyncing}
              className="border-white/10 hover:bg-white/5"
            >
              <RefreshCw className={`w-4 h-4 mr-1.5 ${isSyncing ? 'animate-spin' : ''}`} />
              Sync
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleLogout}
              className="font-semibold"
            >
              Disconnect
            </Button>
          </div>
        )}
      </div>

      {!token ? (
        /* Passwordless OTP API Connection */
        <Card className="max-w-md mx-auto glass border-neon-cyan/20">
          <CardHeader className="text-center space-y-2">
            <div className="w-12 h-12 mx-auto rounded-full bg-neon-cyan/15 text-neon-cyan border border-neon-cyan/35 flex items-center justify-center">
              <Lock className="w-6 h-6" />
            </div>
            <CardTitle>Verify KBK Admin Connection</CardTitle>
            <CardDescription>
              Enter your registered owner phone or email to authorize operations from your portfolio.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {errorMsg && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-400 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                <span>{errorMsg}</span>
              </div>
            )}

            {!otpSent ? (
              <form onSubmit={handleRequestOTP} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Admin Phone / Email</label>
                  <Input
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="e.g. 9346476951"
                    required
                    className="bg-background/50 border-white/10"
                  />
                </div>
                <Button type="submit" disabled={isLoading} className="w-full bg-neon-cyan text-black hover:bg-neon-cyan/95 font-bold">
                  {isLoading ? "Connecting..." : "Request Access OTP"}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOTP} className="space-y-4">
                <div className="p-3 rounded-lg bg-neon-cyan/10 border border-neon-cyan/30 text-xs text-neon-cyan space-y-1 text-center">
                  <div className="font-bold flex items-center justify-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" /> Code Sent Successfully
                  </div>
                  <p className="opacity-80 text-[11px]">{demoHint}</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Enter 6-Digit OTP Code</label>
                  <Input
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    placeholder="123456"
                    maxLength={6}
                    required
                    className="bg-background/50 border-white/10 text-center font-mono tracking-widest text-lg"
                  />
                </div>
                <Button type="submit" disabled={isLoading} className="w-full bg-neon-cyan text-black hover:bg-neon-cyan/95 font-bold">
                  {isLoading ? "Verifying..." : "Verify & Establish Connection"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      ) : (
        /* Connected Owner Management Dashboard */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* List of active owners */}
          <div className="lg:col-span-2 space-y-4">
            <Card className="glass border-white/10">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">Authorized Studio Administrators</CardTitle>
                    <CardDescription>
                      These individuals can log in to KBK Film Studios owner dashboard and access booking lifecycles.
                    </CardDescription>
                  </div>
                  <span className="text-xs text-neon-cyan font-bold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-neon-cyan animate-ping"></span> Live Sync
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {owners.map((ow) => (
                  <div key={ow.id} className="p-4 rounded-xl bg-background/50 border border-white/5 flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">{ow.name}</span>
                        <span className={`px-2 py-0.5 rounded text-[9px] uppercase font-bold ${ow.role === 'primary_owner' ? 'bg-neon-cyan/15 text-neon-cyan border border-neon-cyan/30' : 'bg-white/5 text-muted-foreground'}`}>
                          {ow.role.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground font-mono">
                        {ow.phone} • {ow.email}
                      </p>
                    </div>

                    {ow.role !== 'primary_owner' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveOwner(ow.id, ow.name)}
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Form to add co-owner */}
          <div>
            <Card className="glass border-white/10">
              <CardHeader>
                <div className="flex items-center gap-2 text-neon-cyan">
                  <UserPlus className="w-5 h-5" />
                  <CardTitle className="text-lg">Add Co-Owner Account</CardTitle>
                </div>
                <CardDescription>
                  Register a new administrator to assist with studio management operations.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAddOwner} className="space-y-4 text-xs">
                  <div className="space-y-1.5">
                    <label className="font-semibold text-muted-foreground">Full Name</label>
                    <Input
                      value={newOwnerName}
                      onChange={(e) => setNewOwnerName(e.target.value)}
                      placeholder="e.g. Kurudi Bharath Kumar"
                      required
                      className="bg-background/50 border-white/10"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-semibold text-muted-foreground">Phone Number</label>
                    <Input
                      value={newOwnerPhone}
                      onChange={(e) => setNewOwnerPhone(e.target.value)}
                      placeholder="e.g. 9346227894"
                      required
                      className="bg-background/50 border-white/10"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-semibold text-muted-foreground">Email Address</label>
                    <Input
                      value={newOwnerEmail}
                      onChange={(e) => setNewOwnerEmail(e.target.value)}
                      placeholder="e.g. kbkfilms@gmail.com"
                      required
                      className="bg-background/50 border-white/10"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-semibold text-muted-foreground">Access Role Type</label>
                    <select
                      value={newOwnerRole}
                      onChange={(e) => setNewOwnerRole(e.target.value)}
                      className="w-full px-3 py-2 rounded-md bg-background/50 border border-white/10 text-muted-foreground"
                    >
                      <option value="co_owner">Co-Owner (Permissions to edit, bookings)</option>
                      <option value="primary_owner">Primary Owner (Full root permissions)</option>
                    </select>
                  </div>

                  <Button type="submit" disabled={isLoading} className="w-full bg-neon-cyan text-black hover:bg-neon-cyan/95 font-bold pt-2.5">
                    {isLoading ? "Adding Account..." : "Register Co-Owner"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminKBKOwnership;
