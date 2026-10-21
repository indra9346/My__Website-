
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Pencil, Trash2, Plus, Loader2 } from 'lucide-react';
import {
  DEFAULT_CATEGORY,
  PROJECT_CATEGORIES,
  PROJECTS_QUERY_KEY,
  Project,
  cleanText,
  fetchProjects,
  groupProjectsByCategory,
  normalizeLink,
  parseTags,
  titleKey,
} from '@/lib/projects';

type ProjectForm = {
  title: string;
  Description: string;
  Image: string;
  tags: string;
  github: string;
  Demo: string;
  order: string;
  category: string;
};

type ProjectRow = Omit<Project, 'id' | 'created_at'>;

const emptyForm = (order: number): ProjectForm => ({
  title: '',
  Description: '',
  Image: '',
  tags: '',
  github: '',
  Demo: '',
  order: String(order),
  category: 'Client Projects',
});

const toForm = (project: Project): ProjectForm => ({
  title: project.title || '',
  Description: project.Description || '',
  Image: project.Image || '',
  tags: (project.Tags || []).join(', '),
  github: project.github || '',
  Demo: project.Demo || '',
  order: project.Display_Order == null ? '' : String(project.Display_Order),
  category: project.category || DEFAULT_CATEGORY,
});

// Turns the form into the row that gets saved, or throws a message the admin can act on.
const toRow = (form: ProjectForm): ProjectRow => {
  const title = cleanText(form.title);
  const description = cleanText(form.Description);
  if (!title) throw new Error('Title is required.');
  if (!description) throw new Error('Description is required.');

  const order = Number(form.order);
  if (form.order.trim() === '' || !Number.isInteger(order) || Math.abs(order) > 1_000_000) {
    throw new Error('Order must be a whole number.');
  }

  return {
    title,
    Description: description,
    Image: normalizeLink(form.Image, 'Image URL', true),
    Tags: parseTags(form.tags),
    github: normalizeLink(form.github, 'GitHub URL'),
    Demo: normalizeLink(form.Demo, 'Live Demo URL'),
    Display_Order: order,
    category: form.category,
  };
};

// Row security turns a blocked write into "0 rows changed" rather than an error,
// so every write asks for the changed rows back and checks it got one.
const NOT_SAVED = 'Nothing was saved. The project may have been deleted, or your login has expired - log out and log in again.';
const NOT_DELETED = 'Nothing was deleted. The project may already be gone, or your login has expired - log out and log in again.';

const explain = (error: { code?: string; message: string }) =>
  error.code === '42501'
    ? new Error('This account is not allowed to change projects. Log in with your admin account.')
    : error;

const AdminProjects = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ProjectForm>(emptyForm(1));
  // Shown inside the form: a toast would sit on top of the Save button.
  const [formError, setFormError] = useState<string | null>(null);

  const { data: projects, isLoading, isError, error, refetch } = useQuery({
    queryKey: PROJECTS_QUERY_KEY,
    queryFn: fetchProjects,
  });

  const nextOrder = Math.max(0, ...(projects || []).map(p => p.Display_Order ?? 0)) + 1;

  const saveMutation = useMutation({
    mutationFn: async ({ id, row }: { id: string | null; row: ProjectRow }) => {
      const { data, error } = id
        ? await supabase.from('projects').update(row).eq('id', id).select('id')
        : await supabase.from('projects').insert([row]).select('id');
      if (error) throw explain(error);
      if (!data?.length) throw new Error(NOT_SAVED);
    },
    onSuccess: (_data, { id }) => {
      toast({ title: "Success", description: id ? "Project updated successfully" : "Project added successfully" });
      setIsSheetOpen(false);
    },
    onError: (error: Error) => {
      setFormError(error.message || "Failed to save project");
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: PROJECTS_QUERY_KEY }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.from('projects').delete().eq('id', id).select('id');
      if (error) throw explain(error);
      if (!data?.length) throw new Error(NOT_DELETED);
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Project deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message || "Failed to delete project", variant: "destructive" });
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: PROJECTS_QUERY_KEY }),
  });

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm(nextOrder));
    setFormError(null);
    setIsSheetOpen(true);
  };

  const openEdit = (project: Project) => {
    setEditingId(project.id);
    setForm(toForm(project));
    setFormError(null);
    setIsSheetOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (saveMutation.isPending) return;

    let row: ProjectRow;
    try {
      row = toRow(form);
    } catch (error) {
      setFormError((error as Error).message);
      return;
    }

    const duplicate = projects?.find(p => p.id !== editingId && titleKey(p.title) === titleKey(row.title));
    if (duplicate && !confirm(`A project called "${cleanText(duplicate.title || '')}" already exists. Save this one as well?`)) {
      return;
    }

    saveMutation.mutate({ id: editingId, row });
  };

  const handleDelete = (project: Project) => {
    if (confirm(`Delete "${cleanText(project.title || 'this project')}"? This cannot be undone.`)) {
      deleteMutation.mutate(project.id);
    }
  };

  const setField = (field: keyof ProjectForm, value: string) => {
    setForm(current => ({ ...current, [field]: value }));
    setFormError(null);
  };

  const groupedProjects = groupProjectsByCategory(projects || []);
  const categoryOptions = PROJECT_CATEGORIES.includes(form.category) ? PROJECT_CATEGORIES : [...PROJECT_CATEGORIES, form.category];
  const tagPreview = parseTags(form.tags);

  const inputClass = "w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg focus:outline-none focus:border-neon-cyan text-foreground";

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-bold">Manage Projects</h2>
        <Button onClick={openAdd} disabled={isLoading || isError} className="bg-neon-cyan hover:bg-neon-cyan/80 text-black">
          <Plus className="w-4 h-4 mr-2" /> Add Project
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-neon-cyan"></div>
        </div>
      ) : isError ? (
        <div className="glass rounded-lg p-8 text-center">
          <p className="text-red-400 mb-4">Could not load projects: {(error as Error)?.message || 'unknown error'}</p>
          <Button variant="outline" onClick={() => refetch()}>Try again</Button>
        </div>
      ) : !projects?.length ? (
        <div className="glass rounded-lg p-10 text-center text-muted-foreground">
          No projects yet. Click Add Project to create the first one.
        </div>
      ) : (
        Object.entries(groupedProjects).map(([category, categoryProjects]) => (
          <div key={category} className="mb-8">
            <h3 className="text-lg font-semibold text-neon-cyan mb-3">{category}</h3>
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
                  {categoryProjects.map((project) => {
                    const tags = (project.Tags || []).join(', ');
                    const isDeleting = deleteMutation.isPending && deleteMutation.variables === project.id;
                    return (
                      <TableRow key={project.id}>
                        <TableCell className="font-medium">{project.title}</TableCell>
                        <TableCell className="max-w-[200px] truncate" title={project.Description || ''}>{project.Description}</TableCell>
                        <TableCell className="max-w-[150px] truncate" title={tags}>{tags}</TableCell>
                        <TableCell>{project.Display_Order ?? '-'}</TableCell>
                        <TableCell className="text-right space-x-2 whitespace-nowrap">
                          <Button variant="outline" size="sm" onClick={() => openEdit(project)} aria-label={`Edit ${project.title || 'project'}`}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button variant="destructive" size="sm" onClick={() => handleDelete(project)} disabled={deleteMutation.isPending} aria-label={`Delete ${project.title || 'project'}`}>
                            {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        ))
      )}

      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader><SheetTitle>{editingId ? 'Edit Project' : 'Add New Project'}</SheetTitle></SheetHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-6">
            <div>
              <label htmlFor="project-category" className="block mb-2 text-sm font-medium">Category</label>
              <select id="project-category" value={form.category} onChange={(e) => setField('category', e.target.value)} className={inputClass}>
                {categoryOptions.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="project-title" className="block mb-2 text-sm font-medium">Title</label>
              <input id="project-title" value={form.title} onChange={(e) => setField('title', e.target.value)} className={inputClass} required />
            </div>
            <div>
              <label htmlFor="project-description" className="block mb-2 text-sm font-medium">Description</label>
              <textarea id="project-description" value={form.Description} onChange={(e) => setField('Description', e.target.value)} rows={4} className={inputClass} required />
            </div>
            <div>
              <label htmlFor="project-tags" className="block mb-2 text-sm font-medium">Tags (comma separated)</label>
              <input id="project-tags" value={form.tags} onChange={(e) => setField('tags', e.target.value)} className={inputClass} placeholder="React, TypeScript" />
              {tagPreview.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2" aria-label="Tags that will be saved">
                  {tagPreview.map(tag => (
                    <span key={tag} className="text-xs font-mono px-2 py-1 rounded-full bg-neon-blue/20 text-neon-blue">{tag}</span>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label htmlFor="project-image" className="block mb-2 text-sm font-medium">Image URL</label>
              <input id="project-image" value={form.Image} onChange={(e) => setField('Image', e.target.value)} className={inputClass} placeholder="https://example.com/image.jpg" />
            </div>
            <div>
              <label htmlFor="project-github" className="block mb-2 text-sm font-medium">GitHub URL</label>
              <input id="project-github" value={form.github} onChange={(e) => setField('github', e.target.value)} className={inputClass} placeholder="https://github.com/username/repo" />
            </div>
            <div>
              <label htmlFor="project-demo" className="block mb-2 text-sm font-medium">Live Demo URL</label>
              <input id="project-demo" value={form.Demo} onChange={(e) => setField('Demo', e.target.value)} className={inputClass} placeholder="https://example.com" />
            </div>
            <div>
              <label htmlFor="project-order" className="block mb-2 text-sm font-medium">Order</label>
              <input id="project-order" type="number" step={1} value={form.order} onChange={(e) => setField('order', e.target.value)} className={inputClass} required />
              <p className="mt-1 text-xs text-muted-foreground">Lower numbers show first on your site.</p>
            </div>
            {formError && (
              <p role="alert" className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-400">{formError}</p>
            )}
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsSheetOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-neon-cyan hover:bg-neon-cyan/80 text-black" disabled={saveMutation.isPending}>
                {editingId ? (saveMutation.isPending ? 'Saving...' : 'Save Changes') : (saveMutation.isPending ? 'Adding...' : 'Add Project')}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default AdminProjects;
