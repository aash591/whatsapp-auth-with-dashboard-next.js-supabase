import { createClient } from '@supabase/supabase-js';
import { getServerEnv, getPublicEnv, isServer } from './server-env';

// Public client for client-side operations (limited by RLS)
export const supabase = createClient(
  getPublicEnv('NEXT_PUBLIC_SUPABASE_URL'),
  getPublicEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
);

/**
 * Get Supabase admin client with service role key
 * Server-only function - cannot be called from client-side
 */
export function getSupabaseAdmin() {
  if (!isServer()) {
    throw new Error('getSupabaseAdmin() can only be called on the server side');
  }

  try {
    const serviceRoleKey = getServerEnv('SUPABASE_SERVICE_ROLE_KEY');
    const supabaseUrl = getPublicEnv('NEXT_PUBLIC_SUPABASE_URL');

    return createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
  } catch (error) {
    console.error('Failed to create Supabase admin client:', error);
    throw new Error('Supabase admin client initialization failed');
  }
}

// Legacy export for backward compatibility (deprecated)
// Use getSupabaseAdmin() instead for better security
export const supabaseAdmin = (() => {
  if (isServer()) {
    try {
      return getSupabaseAdmin();
    } catch (error) {
      console.warn('⚠️  Failed to initialize supabaseAdmin, falling back to anon key');
      return createClient(
        getPublicEnv('NEXT_PUBLIC_SUPABASE_URL'),
        getPublicEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
      );
    }
  } else {
    // On client side, return the public client
    return supabase;
  }
})();
