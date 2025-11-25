import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bckujotuhhkagcqfiyye.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJja3Vqb3R1aGhrYWdjcWZpeXllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM5MDk2NjUsImV4cCI6MjA3OTQ4NTY2NX0.CqbNZJeaThbQtolVOB1HVHfV1AT2gsWYS-ZTpUHGq2A';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});