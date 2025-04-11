
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';

type Section = {
  id: string;
  name: string;
  title: string;
  content: string;
  display_order: number;
};

const AdminSections = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingSection, setEditingSection] = useState<Section | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const { data: sections, isLoading } = useQuery({
    queryKey: ['sections'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sections')
        .select('*')
        .order('display_order');
        
      if (error) throw error;
      return data as Section[];
    }
  });
  
  const updateMutation = useMutation({
    mutationFn: async (section: Section) => {
      const { error } = await supabase
        .from('sections')
        .update({
          title: section.title,
          content: section.content,
          updated_at: new Date().toISOString(),
        })
        .eq('id', section.id);
        
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sections'] });
      toast({
        title: "Success",
        description: "Section updated successfully",
      });
      setIsSheetOpen(false);
      setEditingSection(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update section",
        variant: "destructive",
      });
    }
  });

  const handleEdit = (section: Section) => {
    setEditingSection({...section});
    setIsSheetOpen(true);
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingSection) {
      updateMutation.mutate(editingSection);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-bold">Manage Sections</h2>
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
                <TableHead>Name</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Order</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sections?.map((section) => (
                <TableRow key={section.id}>
                  <TableCell className="font-medium">{section.name}</TableCell>
                  <TableCell>{section.title}</TableCell>
                  <TableCell>{section.display_order}</TableCell>
                  <TableCell className="text-right">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleEdit(section)}
                    >
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Edit Section Drawer */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Edit Section: {editingSection?.name}</SheetTitle>
          </SheetHeader>

          {editingSection && (
            <form onSubmit={handleUpdate} className="space-y-6 mt-8">
              <div>
                <label htmlFor="title" className="block mb-2 text-sm font-medium">
                  Title
                </label>
                <input
                  id="title"
                  value={editingSection.title}
                  onChange={(e) => setEditingSection({...editingSection, title: e.target.value})}
                  className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg focus:outline-none focus:border-neon-cyan"
                />
              </div>

              <div>
                <label htmlFor="content" className="block mb-2 text-sm font-medium">
                  Content
                </label>
                <textarea
                  id="content"
                  value={editingSection.content || ''}
                  onChange={(e) => setEditingSection({...editingSection, content: e.target.value})}
                  rows={6}
                  className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg focus:outline-none focus:border-neon-cyan"
                />
              </div>

              <div className="flex justify-end gap-3">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsSheetOpen(false)}
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
    </div>
  );
};

export default AdminSections;
