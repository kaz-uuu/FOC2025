import { createClient } from '@supabase/supabase-js';

// Initialize the Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testConnection() {
  try {
    const { data, error } = await supabase.from('foc_user').select('*').limit(1);
    if (error) {
      console.error('Connection test failed:', error.message);
    } else {
      console.log('Connection successful:', data);
    }
  } catch (e) {
    console.error('Error during connection test:', e);
  }
}

testConnection();