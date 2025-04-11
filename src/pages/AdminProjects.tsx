
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';

type Project = {
  id: string;
  title: string;
  description: string;
  image?: string;
  tags: string[];
  github?: string;
  demo?: string;
  display_order: number;
};

const AdminProjects = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [newProject, setNewProject] = useState<Omit<Project, 'id'>>({
    title: '',
    description: '',
    tags: [],
    display_order: 0,
  });
  const [isEditingSheetOpen, setIsEditingSheetOpen] = useState(false);
  const [isAddSheetOpen, setIsAddSheetOpen] = useState(false);
  const [tagsInput, setTagsInput] = useState('');
  const [newTagsInput, setNewTagsInput] = useState('');

  const { data: projects, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('display_order');
        
      if (error) throw error;
      return data as Project[];
    }
  });
  
  const updateMutation = useMutation({
    mutationFn: async (project: Project) => {
      const { error } = await supabase
        .from('projects')
        .update({
          title: project.title,
          description: project.description,
          image: project.image,
          tags: project.tags,
          github: project.github,
          demo: project.demo,
          updated_at: new Date().toISOString(),
        })
        .eq('id', project.id);
        
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast({
        title: "Success",
        description: "Project updated successfully",
      });
      setIsEditingSheetOpen(false);
      setEditingProject(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update project",
        variant: "destructive",
      });
    }
  });

  const addMutation = useMutation({
    mutationFn: async (project: Omit<Project, 'id'>) => {
      const { error } = await supabase
        .from('projects')
        .insert([project]);
        
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast({
        title: "Success",
        description: "Project added successfully",
      });
      setIsAddSheetOpen(false);
      setNewProject({
        title: '',
        description: '',
        tags: [],
        display_order: 0,
      });
      setNewTagsInput('');
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add project",
        variant: "destructive",
      });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast({
        title: "Success",
        description: "Project deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete project",
        variant: "destructive",
      });
    }
  });

  const handleEdit = (project: Project) => {
    setEditingProject({...project});
    setTagsInput(project.tags.join(', '));
    setIsEditingSheetOpen(true);
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingProject) {
      updateMutation.mutate({
        ...editingProject,
        tags: tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag),
      });
    }
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Get max display order for new project
    const maxOrder = projects ? Math.max(0, ...projects.map(p => p.display_order)) : 0;
    
    addMutation.mutate({
      ...newProject,
      tags: newTagsInput.split(',').map(tag => tag.trim()).filter(tag => tag),
      display_order: maxOrder + 1,
    });
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this project?')) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-bold">Manage Projects</h2>
        <Button 
          onClick={() => setIsAddSheetOpen(true)}
          className="bg-neon-cyan hover:bg-neon-cyan/80 text-black"
        >
          Add Project
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
                  <TableCell className="max-w-[200px] truncate">{project.description}</TableCell>
                  <TableCell className="max-w-[150px] truncate">
                    {project.tags.join(', ')}
                  </TableCell>
                  <TableCell>{project.display_order}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleEdit(project)}
                    >
                      Edit
                    </Button>
                    <Button 
                      variant="destructive" 
                      size="sm" 
                      onClick={() => handleDelete(project.id)}
                      disabled={deleteMutation.isPending}
                    >
                      Delete
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
                <label htmlFor="title" className="block mb-2 text-sm font-medium">
                  Title
                </label>
                <input
                  id="title"
                  value={editingProject.title}
                  onChange={(e) => setEditingProject({...editingProject, title: e.target.value})}
                  className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg focus:outline-none focus:border-neon-cyan"
                />
              </div>

              <div>
                <label htmlFor="description" className="block mb-2 text-sm font-medium">
                  Description
                </label>
                <textarea
                  id="description"
                  value={editingProject.description}
                  onChange={(e) => setEditingProject({...editingProject, description: e.target.value})}
                  rows={3}
                  className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg focus:outline-none focus:border-neon-cyan"
                />
              </div>

              <div>
                <label htmlFor="tags" className="block mb-2 text-sm font-medium">
                  Tags (comma separated)
                </label>
                <input
                  id="tags"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg focus:outline-none focus:border-neon-cyan"
                  placeholder="React, TypeScript, NextJS"
                />
              </div>

              <div>
                <label htmlFor="image" className="block mb-2 text-sm font-medium">
                  Image URL
                </label>
                <input
                  id="image"
                  value={editingProject.image || ''}
                  onChange={(e) => setEditingProject({...editingProject, image: e.target.value})}
                  className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg focus:outline-none focus:border-neon-cyan"
                  placeholder="https://example.com/image.jpg"
                />
              </div>

              <div>
                <label htmlFor="github" className="block mb-2 text-sm font-medium">
                  GitHub URL
                </label>
                <input
                  id="github"
                  value={editingProject.github || ''}
                  onChange={(e) => setEditingProject({...editingProject, github: e.target.value})}
                  className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg focus:outline-none focus:border-neon-cyan"
                  placeholder="https://github.com/username/repo"
                />
              </div>

              <div>
                <label htmlFor="demo" className="block mb-2 text-sm font-medium">
                  Demo URL
                </label>
                <input
                  id="demo"
                  value={editingProject.demo || ''}
                  onChange={(e) => setEditingProject({...editingProject, demo: e.target.value})}
                  className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg focus:outline-none focus:border-neon-cyan"
                  placeholder="https://example.com/demo"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsEditingSheetOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="bg-neon-cyan hover:bg-neon-cyan/80 text-black"
                  disabled={updateMutation.isPending}
                >
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
              <label htmlFor="newTitle" className="block mb-2 text-sm font-medium">
                Title
              </label>
              <input
                id="newTitle"
                value={newProject.title}
                onChange={(e) => setNewProject({...newProject, title: e.target.value})}
                className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg focus:outline-none focus:border-neon-cyan"
                required
              />
            </div>

            <div>
              <label htmlFor="newDescription" className="block mb-2 text-sm font-medium">
                Description
              </label>
              <textarea
                id="newDescription"
                value={newProject.description}
                onChange={(e) => setNewProject({...newProject, description: e.target.value})}
                rows={3}
                className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg focus:outline-none focus:border-neon-cyan"
                required
              />
            </div>

            <div>
              <label htmlFor="newTags" className="block mb-2 text-sm font-medium">
                Tags (comma separated)
              </label>
              <input
                id="newTags"
                value={newTagsInput}
                onChange={(e) => setNewTagsInput(e.target.value)}
                className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg focus:outline-none focus:border-neon-cyan"
                placeholder="React, TypeScript, NextJS"
              />
            </div>

            <div>
              <label htmlFor="newImage" className="block mb-2 text-sm font-medium">
                Image URL
              </label>
              <input
                id="newImage"
                onChange={(e) => setNewProject({...newProject, image: e.target.value})}
                className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg focus:outline-none focus:border-neon-cyan"
                placeholder="https://example.com/image.jpg"
              />
            </div>

            <div>
              <label htmlFor="newGithub" className="block mb-2 text-sm font-medium">
                GitHub URL
              </label>
              <input
                id="newGithub"
                onChange={(e) => setNewProject({...newProject, github: e.target.value})}
                className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg focus:outline-none focus:border-neon-cyan"
                placeholder="https://github.com/username/repo"
              />
            </div>

            <div>
              <label htmlFor="newDemo" className="block mb-2 text-sm font-medium">
                Demo URL
              </label>
              <input
                id="newDemo"
                onChange={(e) => setNewProject({...newProject, demo: e.target.value})}
                className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg focus:outline-none focus:border-neon-cyan"
                placeholder="https://example.com/demo"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsAddSheetOpen(false)}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="bg-neon-cyan hover:bg-neon-cyan/80 text-black"
                disabled={addMutation.isPending}
              >
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
