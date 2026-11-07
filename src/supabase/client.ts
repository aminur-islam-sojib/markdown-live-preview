import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let cachedClient: SupabaseClient | null = null;

/**
 * Checks whether Supabase environment variables are present and valid.
 */
export function isSupabaseConfigured(): boolean {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  return Boolean(url && anonKey && url.startsWith('http'));
}

/**
 * Retrieves or initializes the singleton Supabase client.
 * Returns null if environment variables are not configured,
 * ensuring the app never crashes in unconfigured or offline environments.
 */
export function getSupabase(): SupabaseClient | null {
  if (cachedClient) {
    return cachedClient;
  }

  if (!isSupabaseConfigured()) {
    return null;
  }

  try {
    const url = import.meta.env.VITE_SUPABASE_URL;
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    cachedClient = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });

    return cachedClient;
  } catch (error) {
    console.warn('Failed to initialize Supabase client:', error);
    return null;
  }
}
