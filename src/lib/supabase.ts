import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

/**
 * Supabase client singleton.
 * When env vars are missing (local dev without .env), the client is null
 * and auth features gracefully degrade to unauthenticated mode.
 */
export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

/** Whether Supabase is configured and available */
export const isAuthEnabled = supabase !== null;
