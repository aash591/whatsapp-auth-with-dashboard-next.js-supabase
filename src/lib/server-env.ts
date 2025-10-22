/**
 * Server-only environment variable loader
 * Prevents sensitive environment variables from being exposed to the client
 */

// Server-only environment variables
const SERVER_ENV = {
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  WHATSAPP_ACCESS_TOKEN: process.env.WHATSAPP_ACCESS_TOKEN,
  WHATSAPP_PHONE_NUMBER_ID: process.env.WHATSAPP_PHONE_NUMBER_ID,
  WHATSAPP_APP_SECRET: process.env.WHATSAPP_APP_SECRET,
  WHATSAPP_VERIFY_TOKEN: process.env.WHATSAPP_VERIFY_TOKEN,
  JWT_SECRET: process.env.JWT_SECRET, // Fixed: consistent naming
} as const;

// Public environment variables (safe for client-side)
const PUBLIC_ENV = {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_WHATSAPP_BOT_NUMBER: process.env.NEXT_PUBLIC_WHATSAPP_BOT_NUMBER,
  NEXT_PUBLIC_WHATSAPP_MESSAGE_TEMPLATE: process.env.NEXT_PUBLIC_WHATSAPP_MESSAGE_TEMPLATE,
} as const;

/**
 * Get server-only environment variable
 * Throws error if accessed on client-side
 */
export function getServerEnv<K extends keyof typeof SERVER_ENV>(
  key: K
): NonNullable<typeof SERVER_ENV[K]> {
  // Check if we're on the client side
  if (typeof window !== 'undefined') {
    throw new Error(
      `Environment variable '${key}' is server-only and cannot be accessed on the client side`
    );
  }

  const value = SERVER_ENV[key];
  
  if (!value) {
    throw new Error(`Required server environment variable '${key}' is not set`);
  }

  return value as NonNullable<typeof SERVER_ENV[K]>;
}

/**
 * Get public environment variable
 * Safe for client-side use
 */
export function getPublicEnv<K extends keyof typeof PUBLIC_ENV>(
  key: K
): NonNullable<typeof PUBLIC_ENV[K]> {
  const value = PUBLIC_ENV[key];
  
  if (!value) {
    throw new Error(`Required public environment variable '${key}' is not set`);
  }

  return value as NonNullable<typeof PUBLIC_ENV[K]>;
}

/**
 * Check if we're running on the server
 */
export function isServer(): boolean {
  return typeof window === 'undefined';
}

/**
 * Get all server environment variables (for debugging - server only)
 */
export function getAllServerEnv() {
  if (!isServer()) {
    throw new Error('Cannot access server environment variables on client side');
  }
  
  return SERVER_ENV;
}

/**
 * Validate all required environment variables are set
 */
export function validateServerEnv(): void {
  if (!isServer()) return;

  const requiredVars = [
    'SUPABASE_SERVICE_ROLE_KEY',
    'WHATSAPP_ACCESS_TOKEN',
    'WHATSAPP_PHONE_NUMBER_ID',
    'JWT_SECRET', // Fixed: consistent naming
  ] as const;

  const missing = requiredVars.filter(key => !SERVER_ENV[key]);
  
  if (missing.length > 0) {
    console.warn(`⚠️  Missing server environment variables: ${missing.join(', ')}`);
  }
}



