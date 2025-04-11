
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Section {
  id: string;
  name: string;
  title: string;
  content: string | null;
  display_order: number;
}

export const useSectionContent = (sectionName: string) => {
  return useQuery({
    queryKey: ['section', sectionName],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sections')
        .select('*')
        .eq('name', sectionName)
        .single();
        
      if (error) {
        console.error(`Error fetching section ${sectionName}:`, error);
        return null;
      }
      
      return data as Section;
    }
  });
};
