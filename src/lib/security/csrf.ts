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
  // Always perform comparison to prevent timing attacks
  const maxLength = Math.max(a.length, b.length);
  let result = 0;
  
  for (let i = 0; i < maxLength; i++) {
    const charA = i < a.length ? a.charCodeAt(i) : 0;
    const charB = i < b.length ? b.charCodeAt(i) : 0;
    result |= charA ^ charB;
  }
  
  return result === 0;
}

/**
 * Verify CSRF token using Double Submit Cookie pattern
 * @param headerToken - Token from request header
 * @param cookieToken - Token from cookie
 * @returns True if CSRF token is valid
 */
export function verifyCSRFToken(headerToken: string, cookieToken: string): boolean {
  if (!headerToken || !cookieToken) {
    return false;
  }
  
  return timingSafeEqual(headerToken, cookieToken);
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
  // Always use Secure flag for HTTPS connections
  response.headers.set(
    'Set-Cookie',
    `csrf-token=${token}; Path=/; Max-Age=${10 * 60}; Secure; SameSite=Strict; HttpOnly`
  );
}

// ============================================
// CLIENT-SIDE UTILITIES
// ============================================

/**
 * Get CSRF token from the API
 * The token is automatically stored in an HTTP-only cookie by the server
 * and returned in the response body for client-side header inclusion
 * @returns CSRF token or null if failed
 */
export async function getCSRFToken(): Promise<string | null> {
  try {
    const response = await fetch('/api/auth/csrf-token', {
      method: 'GET',
      credentials: 'include' // Important: includes cookies
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    // Server sets HTTP-only cookie AND returns token for header use
    return data.csrfToken || null;
  } catch {
    return null;
  }
}

















