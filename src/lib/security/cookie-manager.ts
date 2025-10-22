/**
 * Secure Cookie Management Utilities
 * Handles HTTP-only, Secure cookies for sessions and CSRF tokens
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export interface CookieOptions {
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'strict' | 'lax' | 'none';
  maxAge?: number; // in seconds
  path?: string;
}

const DEFAULT_COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  secure: true, // Always secure for HTTPS
  sameSite: 'strict',
  path: '/',
};

/**
 * Set a secure HTTP-only cookie
 * @param response - Next.js response object
 * @param name - Cookie name
 * @param value - Cookie value
 * @param options - Cookie options
 */
export function setSecureCookie(
  response: NextResponse,
  name: string,
  value: string,
  options: CookieOptions = {}
): void {
  const opts = { ...DEFAULT_COOKIE_OPTIONS, ...options };
  
  const cookieString = [
    `${name}=${value}`,
    `Path=${opts.path}`,
    opts.maxAge ? `Max-Age=${opts.maxAge}` : '',
    opts.httpOnly ? 'HttpOnly' : '',
    opts.secure ? 'Secure' : '',
    opts.sameSite ? `SameSite=${opts.sameSite.charAt(0).toUpperCase() + opts.sameSite.slice(1)}` : '',
  ]
    .filter(Boolean)
    .join('; ');

  response.headers.append('Set-Cookie', cookieString);
}

/**
 * Get a secure cookie value
 * @param name - Cookie name
 * @returns Cookie value or null
 */
export async function getSecureCookie(name: string): Promise<string | null> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(name);
  return cookie?.value || null;
}

/**
 * Delete a secure cookie
 * @param response - Next.js response object
 * @param name - Cookie name
 */
export function deleteSecureCookie(
  response: NextResponse,
  name: string
): void {
  response.headers.append(
    'Set-Cookie',
    `${name}=; Path=/; Max-Age=0; HttpOnly; ${
      process.env.NODE_ENV === 'production' ? 'Secure;' : ''
    } SameSite=Strict`
  );
}



