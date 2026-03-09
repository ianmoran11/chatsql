import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

const isValidUrl = (s: string) => s?.startsWith('http://') || s?.startsWith('https://');

export const supabase = createClient(
  isValidUrl(supabaseUrl) ? supabaseUrl : 'http://localhost',
  supabaseAnonKey?.length > 10 ? supabaseAnonKey : 'placeholder'
);
