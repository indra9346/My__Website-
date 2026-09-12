import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import {
  Film,
  ShieldCheck,
  ExternalLink,
  Key,
  CheckCircle2,
  UserCheck,
  Lock,
  Trash2,
  UserPlus,
  RefreshCw,
  AlertCircle,
  Code2,
  Crown,
  Server,
  Sparkles,
  Search,
  XCircle,
  HelpCircle
} from 'lucide-react';

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

  // Configurable API Base (Defaults to localhost:5000/api or stored setting)
  const [apiBase, setApiBase] = useState<string>(() => {
    return localStorage.getItem('kbk_api_base_url') || 'http://localhost:5000/api';
  });
  const [showConfig, setShowConfig] = useState(false);
  const [serverOnline, setServerOnline] = useState<boolean | null>(null);

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
  const [newOwnerName, setNewOwnerName] = useState('Kurudi Bharath Kumar');
  const [newOwnerPhone, setNewOwnerPhone] = useState('9346227894');
  const [newOwnerEmail, setNewOwnerEmail] = useState('kbkfilms.official@gmail.com');
  const [newOwnerRole, setNewOwnerRole] = useState('co_owner');
  const [isSyncing, setIsSyncing] = useState(false);

  // Live Permission Inspector
  const [testIdentifier, setTestIdentifier] = useState('9346227894');
  const [testResult, setTestResult] = useState<{
    checked: boolean;
    authorized: boolean;
    name?: string;
    role?: string;
    message?: string;
  } | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  // Detect Mixed Content Environment
  const isHttpsOrigin = typeof window !== 'undefined' && window.location.protocol === 'https:';

  // Save API Base
  const handleSaveApiBase = (newUrl: string) => {
    const cleaned = newUrl.trim().replace(/\/+$/, '');
    setApiBase(cleaned);
    localStorage.setItem('kbk_api_base_url', cleaned);
    toast({
      title: "API Endpoint Updated",
      description: `Target backend set to: ${cleaned}`,
    });
    checkHealth(cleaned);
  };

  // Check Backend Health
  const checkHealth = async (targetBase: string = apiBase) => {
    try {
      const res = await fetch(`${targetBase}/cms`, { method: 'GET' });
      if (res.ok) {
        setServerOnline(true);
      } else {
        setServerOnline(false);
      }
    } catch (e) {
      setServerOnline(false);
    }
  };

  useEffect(() => {
    checkHealth(apiBase);
  }, [apiBase]);

  // Fetch Owners from KBK Backend
  const fetchOwners = async (activeToken: string, base: string = apiBase) => {
    try {
      setIsSyncing(true);
      const res = await fetch(`${base}/owner/owners`, {
        headers: {
          'Authorization': `Bearer ${activeToken}`
        }
      });
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          handleLogout();
          throw new Error('Developer session expired or unauthorized.');
        }
        throw new Error('Failed to retrieve studio owners list');
      }
      const data = await res.json();
      setOwners(data);
      setServerOnline(true);
    } catch (err: any) {
      setServerOnline(false);
      toast({
        variant: "destructive",
        title: "API Connection Notice",
        description: err.message || "Ensure KBK backend is active on " + base,
      });
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchOwners(token, apiBase);
    }
  }, [token, apiBase]);

  const handleRequestOTP = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!identifier.trim()) return;
    setIsLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch(`${apiBase}/auth/owner-request-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: identifier.trim() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send verification code');
      setOtpSent(true);
      setDemoHint(data.demoHint || 'Enter code: 123456');
      setServerOnline(true);
      toast({
        title: "Access Code Ready",
        description: "Developer authentication code generated for " + identifier,
      });
    } catch (err: any) {
      setServerOnline(false);
      let msg = err.message || 'Connection failed.';
      if (isHttpsOrigin && apiBase.startsWith('http://')) {
        msg = `Mixed-Content Blocked: Browser blocks HTTPS calling HTTP (${apiBase}). To connect live, run backend or allow insecure content in browser settings.`;
      }
      setErrorMsg(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!otpCode.trim()) return;
    setIsLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch(`${apiBase}/auth/owner-verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: identifier.trim(), otpCode: otpCode.trim() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Invalid OTP access code');
      
      localStorage.setItem('kbk_portfolio_owner_token', data.token);
      setToken(data.token);
      setServerOnline(true);
      toast({
        title: "Developer Session Active",
        description: `Verified Developer: ${data.owner.name}`,
      });
    } catch (err: any) {
      setErrorMsg(err.message || 'OTP verification failed.');
    } finally {
      setIsLoading(false);
    }
  };

  // Quick 1-Click Master Developer Connect
  const handleQuickDeveloperConnect = async () => {
    setIdentifier('9346476951');
    setOtpCode('123456');
    setIsLoading(true);
    setErrorMsg('');
    try {
      // Step 1: Request OTP
      await fetch(`${apiBase}/auth/owner-request-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: '9346476951' })
      });

      // Step 2: Verify OTP
      const res = await fetch(`${apiBase}/auth/owner-verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: '9346476951', otpCode: '123456' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to authenticate Developer');

      localStorage.setItem('kbk_portfolio_owner_token', data.token);
      setToken(data.token);
      setServerOnline(true);
      toast({
        title: "Developer Root Session Initialized",
        description: "Welcome K S Indra Kumar! Full management console unlocked.",
      });
    } catch (err: any) {
      setServerOnline(false);
      let msg = err.message || 'Connection failed.';
      if (isHttpsOrigin && apiBase.startsWith('http://')) {
        msg = `Mixed-Content Security Warning: Your browser is on HTTPS (${window.location.origin}) and blocked connecting to HTTP localhost. Please run local dev server or configure backend URL.`;
      }
      setErrorMsg(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddOwner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !newOwnerName.trim() || !newOwnerPhone.trim() || !newOwnerEmail.trim()) return;
    setIsLoading(true);
    try {
      const res = await fetch(`${apiBase}/owner/owners`, {
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
      if (!res.ok) throw new Error(data.error || 'Failed to add studio owner');
      
      toast({
        title: "Studio Owner Authorized",
        description: `${newOwnerName} (${newOwnerPhone}) is now granted Owner Space login access.`,
      });
      fetchOwners(token, apiBase);
      // Auto-update test result if matching
      if (testIdentifier === newOwnerPhone.trim()) {
        runPermissionTest(newOwnerPhone.trim());
      }
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

  const handleRemoveOwner = async (id: string, name: string, phone: string) => {
    if (!token || !confirm(`Revoke all Owner Space access for ${name} (${phone})?`)) return;
    try {
      const res = await fetch(`${apiBase}/owner/owners/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to revoke ownership access');
      
      toast({
        title: "Access Revoked",
        description: `${name} has been disconnected and blocked from KBK Film Studios.`,
      });
      fetchOwners(token, apiBase);
      // Auto-update test result if matching
      if (testIdentifier === phone) {
        runPermissionTest(phone);
      }
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Failed to Revoke Access",
        description: err.message,
      });
    }
  };

  // Live Permission Inspector Test
  const runPermissionTest = async (phoneOrEmail: string) => {
    if (!phoneOrEmail.trim()) return;
    setIsTesting(true);
    try {
      const res = await fetch(`${apiBase}/owner/check-access`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: phoneOrEmail.trim() })
      });
      const data = await res.json();
      if (data.authorized) {
        setTestResult({
          checked: true,
          authorized: true,
          name: data.owner.name,
          role: data.owner.role === 'primary_owner' || data.owner.phone === '9346476951' ? 'DEVELOPER (ROOT ACCESS)' : 'STUDIO OWNER',
          message: `${data.owner.name} is currently authorized to log in to KBK Film Studios Owner Space.`
        });
      } else {
        setTestResult({
          checked: true,
          authorized: false,
          message: `Access is strictly REVOKED / BLOCKED for ${phoneOrEmail}. Login will be denied.`
        });
      }
    } catch (err: any) {
      setTestResult({
        checked: true,
        authorized: false,
        message: 'Could not reach server to test permissions.'
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('kbk_portfolio_owner_token');
    setToken(null);
    setOtpSent(false);
    setOwners([]);
    setErrorMsg('');
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold">KBK Film Studios Management Console</h2>
            <span className="px-2.5 py-0.5 rounded-full bg-neon-cyan/15 text-neon-cyan border border-neon-cyan/30 text-xs font-bold flex items-center gap-1">
              <Code2 className="w-3.5 h-3.5" /> DEVELOPER ACCESS
            </span>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Authorize studio owners (e.g. Bharath Kumar), oversee privileges, and manage studio access directly from your portfolio.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowConfig(!showConfig)}
            className="border-white/10 text-xs"
          >
            <Server className="w-3.5 h-3.5 mr-1.5" />
            Backend: {serverOnline ? '🟢 Online' : (serverOnline === false ? '🔴 Offline' : '⚪ Checking')}
          </Button>

          {token && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchOwners(token, apiBase)}
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
            </>
          )}
        </div>
      </div>

      {/* Backend API Configuration Drawer / Banner */}
      {showConfig && (
        <Card className="glass border-white/10 bg-black/40">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-neon-cyan flex items-center gap-1.5">
                <Server className="w-4 h-4" /> KBK Film Studios Backend API Endpoint Settings
              </span>
              <span className="text-[11px] text-muted-foreground">Active: <code className="text-white">{apiBase}</code></span>
            </div>
            
            <div className="flex flex-col sm:flex-row items-center gap-2">
              <Input
                value={apiBase}
                onChange={(e) => setApiBase(e.target.value)}
                placeholder="http://localhost:5000/api"
                className="bg-background/60 border-white/15 text-xs font-mono"
              />
              <div className="flex gap-2 w-full sm:w-auto">
                <Button
                  size="sm"
                  onClick={() => handleSaveApiBase(apiBase)}
                  className="bg-neon-cyan text-black hover:bg-neon-cyan/90 text-xs font-semibold"
                >
                  Save Endpoint
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleSaveApiBase('http://localhost:5000/api')}
                  className="border-white/10 text-xs"
                >
                  Reset Default
                </Button>
              </div>
            </div>

            {isHttpsOrigin && apiBase.startsWith('http://') && (
              <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-300 space-y-1">
                <p className="font-semibold flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" /> Note for Live Vercel HTTPS Deployment:
                </p>
                <p className="opacity-90">
                  Modern browsers block HTTPS websites from calling HTTP localhost directly. When running locally on <code>http://localhost:8080</code>, connections connect instantly!
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {!token ? (
        /* Passwordless Developer Auth Card */
        <Card className="max-w-xl mx-auto glass border-neon-cyan/30 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 transform translate-x-4 -translate-y-4 w-32 h-32 bg-neon-cyan/10 rounded-full blur-2xl pointer-events-none"></div>

          <CardHeader className="text-center space-y-2 pb-3">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-neon-cyan/15 text-neon-cyan border border-neon-cyan/35 flex items-center justify-center shadow-inner">
              <Code2 className="w-7 h-7" />
            </div>
            <CardTitle className="text-xl">Developer Console Authentication</CardTitle>
            <CardDescription className="text-xs max-w-md mx-auto">
              You are recognized as the <strong>Developer & Creator</strong> of KBK Film Studios. Initialize root access to manage studio owners and privileges.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 pt-1">
            {/* Identity Badge */}
            <div className="p-3.5 rounded-xl bg-neon-cyan/10 border border-neon-cyan/25 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-neon-cyan/20 flex items-center justify-center text-neon-cyan font-bold">
                  IK
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-sm">K S Indra Kumar</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-neon-cyan text-black">
                      DEVELOPER
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground font-mono">
                    9346476951 • ik9893344@gmail.com
                  </p>
                </div>
              </div>
              <ShieldCheck className="w-6 h-6 text-neon-cyan shrink-0" />
            </div>

            {errorMsg && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-400 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{errorMsg}</span>
              </div>
            )}

            {/* 1-Click Master Connect */}
            <Button
              onClick={handleQuickDeveloperConnect}
              disabled={isLoading}
              className="w-full bg-neon-cyan text-black hover:bg-neon-cyan/90 font-bold py-6 text-sm flex items-center justify-center gap-2 shadow-lg shadow-neon-cyan/20"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Connecting Root Session...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  1-Click Initialize Developer Access
                </>
              )}
            </Button>

            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-white/10"></div>
              <span className="flex-shrink mx-3 text-[10px] uppercase text-muted-foreground font-mono">Or Manual OTP Login</span>
              <div className="flex-grow border-t border-white/10"></div>
            </div>

            {!otpSent ? (
              <form onSubmit={handleRequestOTP} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Admin Phone / Email</label>
                  <Input
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="9346476951"
                    required
                    className="bg-background/50 border-white/10 font-mono text-sm"
                  />
                </div>
                <Button type="submit" variant="outline" disabled={isLoading} className="w-full border-white/10 text-xs">
                  {isLoading ? "Requesting..." : "Send Verification OTP"}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOTP} className="space-y-3">
                <div className="p-2.5 rounded-lg bg-neon-cyan/10 border border-neon-cyan/30 text-xs text-neon-cyan text-center">
                  <p className="font-bold">Code Sent Successfully (Demo: 123456)</p>
                </div>
                <div className="space-y-1">
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
                  {isLoading ? "Verifying..." : "Verify & Connect"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      ) : (
        /* Connected Developer Studio Management Dashboard */
        <div className="space-y-6">
          {/* Top Developer Status Bar */}
          <div className="p-4 rounded-xl glass border-neon-cyan/30 bg-black/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-neon-cyan/15 border border-neon-cyan/35 flex items-center justify-center text-neon-cyan font-bold shadow-sm">
                <Code2 className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white text-base">K S Indra Kumar</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-neon-cyan text-black flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> DEVELOPER
                  </span>
                </div>
                <p className="text-xs text-muted-foreground font-mono">
                  Master Architect • Irrevocable Root Privileges • 9346476951
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <a
                href="http://localhost:5173/owner"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neon-cyan/15 hover:bg-neon-cyan/25 text-neon-cyan border border-neon-cyan/30 text-xs font-bold transition"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Launch KBK Owner Space
              </a>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* List of active studio administrators */}
            <div className="lg:col-span-2 space-y-6">
              <Card className="glass border-white/10 shadow-lg">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">Authorized Studio Administrators</CardTitle>
                      <CardDescription className="text-xs mt-0.5">
                        These individuals can log in to KBK Film Studios Owner Space and manage bookings, pipeline, and deliveries.
                      </CardDescription>
                    </div>
                    <span className="text-xs text-neon-cyan font-bold flex items-center gap-1.5 bg-neon-cyan/10 px-2.5 py-1 rounded-full border border-neon-cyan/20">
                      <span className="w-2 h-2 rounded-full bg-neon-cyan animate-ping"></span> Live Sync Active
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {owners.map((ow) => {
                    const isDeveloper = ow.role === 'primary_owner' || ow.phone === '9346476951';
                    return (
                      <div
                        key={ow.id}
                        className={`p-4 rounded-xl border transition flex items-center justify-between gap-4 ${
                          isDeveloper
                            ? 'bg-neon-cyan/5 border-neon-cyan/30 shadow-sm'
                            : 'bg-background/50 border-white/10 hover:border-white/20'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-sm">{ow.name}</span>
                            {isDeveloper ? (
                              <span className="px-2 py-0.5 rounded text-[9px] font-extrabold uppercase bg-neon-cyan text-black flex items-center gap-1">
                                <Code2 className="w-2.5 h-2.5" /> DEVELOPER
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-white/10 text-neon-cyan border border-neon-cyan/20">
                                STUDIO OWNER
                              </span>
                            )}
                            <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Active
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground font-mono">
                            {ow.phone} • {ow.email}
                          </p>
                          <p className="text-[10px] text-muted-foreground/80">
                            Permissions: {ow.permissions?.join(', ') || 'All standard management privileges'}
                          </p>
                        </div>

                        <div>
                          {isDeveloper ? (
                            <span className="text-[11px] text-neon-cyan/80 font-mono font-semibold px-2 py-1 bg-neon-cyan/10 rounded-md border border-neon-cyan/20">
                              Root Protected
                            </span>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveOwner(ow.id, ow.name, ow.phone)}
                              className="text-red-400 hover:text-red-300 hover:bg-red-500/10 text-xs font-semibold"
                            >
                              <Trash2 className="w-3.5 h-3.5 mr-1" /> Revoke Access
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              {/* Live Permission Inspector Tool */}
              <Card className="glass border-white/10">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2 text-neon-cyan">
                    <Search className="w-4 h-4" />
                    <CardTitle className="text-base">Live Access & Permission Inspector</CardTitle>
                  </div>
                  <CardDescription className="text-xs">
                    Test in real-time whether a specific phone number or email can currently log in to the KBK Film Studios Owner Space.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex gap-2">
                    <Input
                      value={testIdentifier}
                      onChange={(e) => setTestIdentifier(e.target.value)}
                      placeholder="e.g. 9346227894"
                      className="bg-background/50 border-white/10 font-mono text-xs"
                    />
                    <Button
                      size="sm"
                      onClick={() => runPermissionTest(testIdentifier)}
                      disabled={isTesting}
                      className="bg-neon-cyan text-black hover:bg-neon-cyan/90 font-bold text-xs shrink-0"
                    >
                      {isTesting ? "Checking..." : "Inspect Access"}
                    </Button>
                  </div>

                  {testResult && (
                    <div
                      className={`p-3.5 rounded-xl border text-xs flex items-start gap-3 ${
                        testResult.authorized
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                          : 'bg-red-500/10 border-red-500/30 text-red-400'
                      }`}
                    >
                      {testResult.authorized ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                      )}
                      <div className="space-y-1">
                        <div className="font-bold flex items-center gap-2">
                          <span>{testResult.authorized ? "ACCESS GRANTED" : "ACCESS BLOCKED / UNAUTHORIZED"}</span>
                          {testResult.role && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] uppercase bg-black/40 font-mono">
                              {testResult.role}
                            </span>
                          )}
                        </div>
                        <p className="opacity-90">{testResult.message}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Form to add studio owner */}
            <div>
              <Card className="glass border-white/10 sticky top-4">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2 text-neon-cyan">
                    <UserPlus className="w-5 h-5" />
                    <CardTitle className="text-base">Authorize Studio Owner</CardTitle>
                  </div>
                  <CardDescription className="text-xs">
                    Grant owner privileges to Kurudi Bharath Kumar or another studio co-owner.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleAddOwner} className="space-y-3.5 text-xs">
                    <div className="space-y-1">
                      <label className="font-semibold text-muted-foreground">Full Name</label>
                      <Input
                        value={newOwnerName}
                        onChange={(e) => setNewOwnerName(e.target.value)}
                        placeholder="Kurudi Bharath Kumar"
                        required
                        className="bg-background/50 border-white/10"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-semibold text-muted-foreground">Phone Number</label>
                      <Input
                        value={newOwnerPhone}
                        onChange={(e) => setNewOwnerPhone(e.target.value)}
                        placeholder="9346227894"
                        required
                        className="bg-background/50 border-white/10 font-mono"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-semibold text-muted-foreground">Email Address</label>
                      <Input
                        value={newOwnerEmail}
                        onChange={(e) => setNewOwnerEmail(e.target.value)}
                        placeholder="kbkfilms.official@gmail.com"
                        required
                        className="bg-background/50 border-white/10"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-semibold text-muted-foreground">Access Role Type</label>
                      <select
                        value={newOwnerRole}
                        onChange={(e) => setNewOwnerRole(e.target.value)}
                        className="w-full px-3 py-2 rounded-md bg-background/50 border border-white/10 text-muted-foreground text-xs"
                      >
                        <option value="co_owner">Studio Owner / Co-Owner (Bookings, Editing, Deliveries)</option>
                        <option value="lead_editor">Lead Editor (Deliveries & Works)</option>
                      </select>
                    </div>

                    <Button
                      type="submit"
                      disabled={isLoading}
                      className="w-full bg-neon-cyan text-black hover:bg-neon-cyan/95 font-bold pt-2 mt-2"
                    >
                      {isLoading ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-1.5 animate-spin" /> Authorizing...
                        </>
                      ) : (
                        "Authorize Studio Owner"
                      )}
                    </Button>

                    <div className="p-2.5 rounded-lg bg-white/5 border border-white/10 text-[11px] text-muted-foreground space-y-1">
                      <p className="font-semibold text-white flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-neon-cyan" /> Immediate Effect
                      </p>
                      <p>
                        Once authorized, the co-owner can immediately log into <code>/owner</code> using their phone number and OTP <code>123456</code>.
                      </p>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminKBKOwnership;

