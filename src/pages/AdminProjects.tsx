
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Pencil, Trash2, Plus } from 'lucide-react';

type Project = {
  id: string;
  title: string | null;
  Description: string | null;
  Image: string | null;
  Tags: string[] | null;
  github: string | null;
  Demo: string | null;
  Display_Order: number | null;
  created_at: string;
};

type ProjectForm = {
  title: string;
  Description: string;
  Image: string;
  Tags: string[];
  github: string;
  Demo: string;
};

const AdminProjects = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [isEditingSheetOpen, setIsEditingSheetOpen] = useState(false);
  const [isAddSheetOpen, setIsAddSheetOpen] = useState(false);
  const [tagsInput, setTagsInput] = useState('');
  const [newTagsInput, setNewTagsInput] = useState('');
  const [newProject, setNewProject] = useState<ProjectForm>({
    title: '',
    Description: '',
    Image: '',
    Tags: [],
    github: '',
    Demo: '',
  });

  const { data: projects, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('Display_Order', { ascending: true });

      if (error) throw error;
      return data;
    }
  });

  const updateMutation = useMutation({
    mutationFn: async (project: Project) => {
      const { error } = await supabase
        .from('projects')
        .update({
          title: project.title,
          Description: project.Description,
          Image: project.Image,
          Tags: project.Tags,
          github: project.github,
          Demo: project.Demo,
        })
        .eq('id', project.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast({ title: "Success", description: "Project updated successfully" });
      setIsEditingSheetOpen(false);
      setEditingProject(null);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to update project", variant: "destructive" });
    }
  });

  const addMutation = useMutation({
    mutationFn: async (project: ProjectForm & { Display_Order: number }) => {
      const { error } = await supabase
        .from('projects')
        .insert([{
          title: project.title,
          Description: project.Description,
          Image: project.Image || null,
          Tags: project.Tags,
          github: project.github || null,
          Demo: project.Demo || null,
          Display_Order: project.Display_Order,
        }]);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast({ title: "Success", description: "Project added successfully" });
      setIsAddSheetOpen(false);
      setNewProject({ title: '', Description: '', Image: '', Tags: [], github: '', Demo: '' });
      setNewTagsInput('');
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to add project", variant: "destructive" });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('projects').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast({ title: "Success", description: "Project deleted successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to delete project", variant: "destructive" });
    }
  });

  const handleEdit = (project: Project) => {
    setEditingProject({ ...project });
    setTagsInput((project.Tags || []).join(', '));
    setIsEditingSheetOpen(true);
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingProject) {
      updateMutation.mutate({
        ...editingProject,
        Tags: tagsInput.split(',').map(tag => tag.trim()).filter(Boolean),
      });
    }
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const maxOrder = projects ? Math.max(0, ...projects.map(p => p.Display_Order || 0)) : 0;
    addMutation.mutate({
      ...newProject,
      Tags: newTagsInput.split(',').map(tag => tag.trim()).filter(Boolean),
      Display_Order: maxOrder + 1,
    });
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this project?')) {
      deleteMutation.mutate(id);
    }
  };

  const inputClass = "w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg focus:outline-none focus:border-neon-cyan text-foreground";

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-bold">Manage Projects</h2>
        <Button onClick={() => setIsAddSheetOpen(true)} className="bg-neon-cyan hover:bg-neon-cyan/80 text-black">
          <Plus className="w-4 h-4 mr-2" /> Add Project
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-neon-cyan"></div>
        </div>
      ) : (
        <div className="glass rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead>Order</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projects?.map((project) => (
                <TableRow key={project.id}>
                  <TableCell className="font-medium">{project.title}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{project.Description}</TableCell>
                  <TableCell className="max-w-[150px] truncate">{(project.Tags || []).join(', ')}</TableCell>
                  <TableCell>{project.Display_Order}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="outline" size="sm" onClick={() => handleEdit(project)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => handleDelete(project.id)} disabled={deleteMutation.isPending}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Edit Project Sheet */}
      <Sheet open={isEditingSheetOpen} onOpenChange={setIsEditingSheetOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Edit Project</SheetTitle>
          </SheetHeader>
          {editingProject && (
            <form onSubmit={handleUpdate} className="space-y-4 mt-6">
              <div>
                <label className="block mb-2 text-sm font-medium">Title</label>
                <input value={editingProject.title || ''} onChange={(e) => setEditingProject({ ...editingProject, title: e.target.value })} className={inputClass} />
              </div>
              <div>
                <label className="block mb-2 text-sm font-medium">Description</label>
                <textarea value={editingProject.Description || ''} onChange={(e) => setEditingProject({ ...editingProject, Description: e.target.value })} rows={3} className={inputClass} />
              </div>
              <div>
                <label className="block mb-2 text-sm font-medium">Tags (comma separated)</label>
                <input value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} className={inputClass} placeholder="React, TypeScript, NextJS" />
              </div>
              <div>
                <label className="block mb-2 text-sm font-medium">Image URL</label>
                <input value={editingProject.Image || ''} onChange={(e) => setEditingProject({ ...editingProject, Image: e.target.value })} className={inputClass} placeholder="https://example.com/image.jpg" />
              </div>
              <div>
                <label className="block mb-2 text-sm font-medium">GitHub URL</label>
                <input value={editingProject.github || ''} onChange={(e) => setEditingProject({ ...editingProject, github: e.target.value })} className={inputClass} placeholder="https://github.com/username/repo" />
              </div>
              <div>
                <label className="block mb-2 text-sm font-medium">Live Demo URL</label>
                <input value={editingProject.Demo || ''} onChange={(e) => setEditingProject({ ...editingProject, Demo: e.target.value })} className={inputClass} placeholder="https://example.com" />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsEditingSheetOpen(false)}>Cancel</Button>
                <Button type="submit" className="bg-neon-cyan hover:bg-neon-cyan/80 text-black" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          )}
        </SheetContent>
      </Sheet>

      {/* Add Project Sheet */}
      <Sheet open={isAddSheetOpen} onOpenChange={setIsAddSheetOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Add New Project</SheetTitle>
          </SheetHeader>
          <form onSubmit={handleAdd} className="space-y-4 mt-6">
            <div>
              <label className="block mb-2 text-sm font-medium">Title</label>
              <input value={newProject.title} onChange={(e) => setNewProject({ ...newProject, title: e.target.value })} className={inputClass} required />
            </div>
            <div>
              <label className="block mb-2 text-sm font-medium">Description</label>
              <textarea value={newProject.Description} onChange={(e) => setNewProject({ ...newProject, Description: e.target.value })} rows={3} className={inputClass} required />
            </div>
            <div>
              <label className="block mb-2 text-sm font-medium">Tags (comma separated)</label>
              <input value={newTagsInput} onChange={(e) => setNewTagsInput(e.target.value)} className={inputClass} placeholder="React, TypeScript" />
            </div>
            <div>
              <label className="block mb-2 text-sm font-medium">Image URL</label>
              <input onChange={(e) => setNewProject({ ...newProject, Image: e.target.value })} className={inputClass} placeholder="https://example.com/image.jpg" />
            </div>
            <div>
              <label className="block mb-2 text-sm font-medium">GitHub URL</label>
              <input onChange={(e) => setNewProject({ ...newProject, github: e.target.value })} className={inputClass} placeholder="https://github.com/username/repo" />
            </div>
            <div>
              <label className="block mb-2 text-sm font-medium">Live Demo URL</label>
              <input onChange={(e) => setNewProject({ ...newProject, Demo: e.target.value })} className={inputClass} placeholder="https://example.com" />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsAddSheetOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-neon-cyan hover:bg-neon-cyan/80 text-black" disabled={addMutation.isPending}>
                {addMutation.isPending ? 'Adding...' : 'Add Project'}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default AdminProjects;
