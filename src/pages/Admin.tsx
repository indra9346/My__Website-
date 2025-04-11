
import { Link } from 'react-router-dom';

const Admin = () => {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-8">Admin Dashboard</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link to="/admin/sections" className="glass p-6 rounded-lg hover:border-neon-cyan border border-transparent transition-colors">
          <h3 className="text-xl font-bold mb-2">Manage Sections</h3>
          <p className="text-gray-300">Edit website sections like About, Hero, and Contact</p>
        </Link>
        
        <Link to="/admin/projects" className="glass p-6 rounded-lg hover:border-neon-cyan border border-transparent transition-colors">
          <h3 className="text-xl font-bold mb-2">Manage Projects</h3>
          <p className="text-gray-300">Add, edit, or remove projects from your portfolio</p>
        </Link>
      </div>
    </div>
  );
};

export default Admin;
