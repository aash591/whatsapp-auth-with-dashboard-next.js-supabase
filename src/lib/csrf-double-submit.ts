/**
 * Double Submit Cookie CSRF Protection (Edge Runtime Compatible)
 * More secure than Origin/Referer headers, simpler than session-based tokens
 */

import { NextRequest, NextResponse } from 'next/server';

/**
 * Generate a cryptographically secure CSRF token (Edge Runtime Compatible)
 * @returns Random 64-byte hex string for maximum security
 */
export function generateCSRFToken(): string {
  // Use Web Crypto API for Edge runtime compatibility
  const array = new Uint8Array(64);
  crypto.getRandomValues(array);
  
  // Convert to hex string
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Timing-safe comparison for Edge Runtime (Web Crypto API compatible)
 * @param a - First string to compare
 * @param b - Second string to compare
 * @returns True if strings are equal
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  
  return result === 0;
}

/**
 * Validate CSRF token using Double Submit Cookie pattern (Edge Runtime Compatible)
 * @param request - NextRequest object
 * @returns True if CSRF token is valid
 */
export function validateDoubleSubmitCSRF(request: NextRequest): boolean {
  // Skip CSRF validation for GET requests
  if (request.method === 'GET') {
    return true;
  }

  // Get CSRF token from request header
  const csrfToken = request.headers.get('x-csrf-token');
  
  // Get CSRF token from cookie
  const csrfCookie = request.cookies.get('csrf-token')?.value;

  if (!csrfToken || !csrfCookie) {
    return false;
  }

  // Validate using constant-time comparison (Edge Runtime compatible)
  return timingSafeEqual(csrfToken, csrfCookie);
}

/**
 * Set CSRF cookie in response (HttpOnly for security)
 * @param response - NextResponse object
 * @param token - CSRF token
 */
export function setCSRFCookie(response: NextResponse, token: string): void {
  // Set HttpOnly cookie for security with shorter expiration
  // In development, don't use Secure flag for localhost
  const isDevelopment = process.env.NODE_ENV === 'development';
  const secureFlag = isDevelopment ? '' : 'Secure;';
  
  response.headers.set(
    'Set-Cookie',
    `csrf-token=${token}; Path=/; Max-Age=${10 * 60}; ${secureFlag} SameSite=Strict; HttpOnly`
  );
}
