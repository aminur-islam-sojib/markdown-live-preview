import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let cachedClient: SupabaseClient | null = null;

/**
 * Retrieves the public/anon key, supporting both the latest VITE_SUPABASE_PUBLISHABLE_KEY
 * convention and the legacy VITE_SUPABASE_ANON_KEY.
 */
function getSupabaseKey(): string | undefined {
  return import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;
}

/**
 * Checks whether Supabase environment variables are present and valid.
 */
export function isSupabaseConfigured(): boolean {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = getSupabaseKey();
  return Boolean(url && key && url.startsWith('http'));
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
    const key = getSupabaseKey();
    if (!url || !key) return null;

    cachedClient = createClient(url, key, {
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
