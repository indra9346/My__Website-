
import { useEffect, useState } from 'react';
import { Link, Navigate, Outlet, useNavigate } from 'react-router-dom';
import iLogo from '@/assets/i-logo.svg';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { User } from '@supabase/supabase-js';

const AdminLayout = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Check for existing session
    const getSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        setUser(data.session?.user || null);
      } catch (error) {
        console.error('Error getting session:', error);
      } finally {
        setLoading(false);
      }
    };

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user || null);
      }
    );

    getSession();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      navigate('/auth');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-neon-cyan"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="relative isolate min-h-screen bg-background flex flex-col">
      {/* The I logo as a large, faint watermark behind every admin page. */}
      <img
        src={iLogo}
        alt=""
        aria-hidden="true"
        className="pointer-events-none select-none fixed left-1/2 top-1/2 -z-10 w-[min(78vw,78vh)] -translate-x-1/2 -translate-y-1/2 opacity-[0.07]"
      />
      <header className="bg-gray-900/90 py-4 border-b border-gray-800">
        <div className="container mx-auto px-4 flex flex-wrap justify-between items-center gap-3">
          <Link to="/admin" className="flex items-center gap-3">
            <img src={iLogo} alt="" className="h-9 w-9" />
            <h1 className="text-xl font-bold text-neon-cyan">Admin Dashboard</h1>
          </Link>
          <div className="flex flex-wrap items-center gap-4">
            <a href="/" className="text-sm text-gray-300 hover:text-neon-cyan transition-colors">View site</a>
            <span className="text-sm text-gray-300 break-all">{user.email}</span>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-grow container mx-auto px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
