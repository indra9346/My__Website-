
import { supabase } from '@/integrations/supabase/client';

export const initAdminUser = async () => {
  try {
    // Check if admin user exists by trying to sign in
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: 'admin@example.com',
      password: 'indra9346',
    });
    
    if (!signInError && signInData.user) {
      console.log('Admin user already exists');
      // Sign out after checking
      await supabase.auth.signOut();
      return;
    }

    // Create admin user if sign in failed
    const { error } = await supabase.auth.signUp({
      email: 'ik9893344@gmail.com',
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
