
import { supabase } from '@/integrations/supabase/client';

export const initAdminUser = async () => {
  try {
    // Check if admin user exists
    const { data: existingUser, error: checkError } = await supabase.auth.admin.getUserByEmail('admin@example.com');
    
    if (!checkError && existingUser) {
      console.log('Admin user already exists');
      return;
    }

    // Create admin user
    const { error } = await supabase.auth.signUp({
      email: 'admin@example.com',
      password: 'indra9346',
    });

    if (error) {
      throw error;
    }

    console.log('Admin user created successfully');
  } catch (error) {
    console.error('Error initializing admin user:', error);
  }
};
