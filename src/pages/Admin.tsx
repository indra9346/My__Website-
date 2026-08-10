import { Link } from 'react-router-dom';
import { FolderKanban, Settings, Megaphone, Film, ShieldCheck } from 'lucide-react';

const Admin = () => {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-8">Admin Dashboard</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link to="/admin/projects" className="glass p-6 rounded-lg hover:border-neon-cyan border border-transparent transition-colors flex items-start gap-4">
          <FolderKanban className="w-8 h-8 text-neon-cyan shrink-0 mt-1" />
          <div>
            <h3 className="text-xl font-bold mb-2">Manage Projects</h3>
            <p className="text-muted-foreground">Add, edit, or remove projects from your portfolio</p>
          </div>
        </Link>
        
        <Link to="/admin/promotions" className="glass p-6 rounded-lg hover:border-neon-cyan border border-transparent transition-colors flex items-start gap-4">
          <Megaphone className="w-8 h-8 text-neon-cyan shrink-0 mt-1" />
          <div>
            <h3 className="text-xl font-bold mb-2">Manage Promotions</h3>
            <p className="text-muted-foreground">Create and manage promotional banners for your portfolio</p>
          </div>
        </Link>

        {/* KBK Film Studios Ownership Card */}
        <Link to="/admin/kbk-ownership" className="glass p-6 rounded-lg hover:border-neon-cyan border border-neon-cyan/20 transition-colors flex items-start gap-4">
          <Film className="w-8 h-8 text-neon-cyan shrink-0 mt-1" />
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-bold mb-2">KBK Studios Ownership</h3>
              <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-neon-cyan/20 text-neon-cyan">Primary</span>
            </div>
            <p className="text-muted-foreground">Manage primary ownership and studio access for KBK Film Studios</p>
          </div>
        </Link>

        <Link to="/admin/settings" className="glass p-6 rounded-lg hover:border-neon-cyan border border-transparent transition-colors flex items-start gap-4">
          <Settings className="w-8 h-8 text-neon-cyan shrink-0 mt-1" />
          <div>
            <h3 className="text-xl font-bold mb-2">Account Settings</h3>
            <p className="text-muted-foreground">Update your admin email and password</p>
          </div>
        </Link>
      </div>
    </div>
  );
};

export default Admin;
