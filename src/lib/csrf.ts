/**
 * CSRF Protection Implementation
 * Provides secure CSRF token generation and validation
 */

import crypto from 'crypto';
import { NextRequest } from 'next/server';

interface CSRFToken {
  token: string;
  expiresAt: number;
}

// In-memory store for CSRF tokens (in production, use Redis or database)
const csrfTokens = new Map<string, CSRFToken>();

// Clean up expired tokens every 5 minutes
setInterval(() => {
  const now = Date.now();
  const keysToDelete: string[] = [];
  
  csrfTokens.forEach((token, key) => {
    if (token.expiresAt < now) {
      keysToDelete.push(key);
    }
  });
  
  keysToDelete.forEach(key => csrfTokens.delete(key));
}, 5 * 60 * 1000);

/**
 * Generate a cryptographically secure CSRF token
 * @param sessionId - User session identifier
 * @returns CSRF token
 */
export function generateCSRFToken(sessionId: string): string {
  // Generate cryptographically secure random token (64 bytes for maximum security)
  const token = crypto.randomBytes(64).toString('hex');
  
  // Store token with shorter expiration (10 minutes) for security
  const expiresAt = Date.now() + (10 * 60 * 1000);
  csrfTokens.set(sessionId, { token, expiresAt });
  
  return token;
}

/**
 * Validate CSRF token
 * @param sessionId - User session identifier
 * @param token - CSRF token to validate
 * @returns True if token is valid
 */
export function validateCSRFToken(sessionId: string, token: string): boolean {
  const storedToken = csrfTokens.get(sessionId);
  
  if (!storedToken) {
    return false;
  }
  
  // Check if token expired
  if (storedToken.expiresAt < Date.now()) {
    csrfTokens.delete(sessionId);
    return false;
  }
  
  // Use timing-safe comparison to prevent timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(storedToken.token),
    Buffer.from(token)
  );
}

/**
 * Extract CSRF token from request
 * @param request - NextRequest object
 * @returns Promise with CSRF token or null
 */
export async function extractCSRFToken(request: NextRequest): Promise<string | null> {
  // Try to get from header first (preferred)
  const headerToken = request.headers.get('x-csrf-token');
  if (headerToken) {
    return headerToken;
  }
  
  // Fallback to form data
  try {
    const formData = await request.formData();
    return formData.get('csrf_token') as string || null;
  } catch {
    return null;
  }
}

/**
 * Extract session ID from request
 * @param request - NextRequest object
 * @returns Session ID or null
 */
export function extractSessionId(request: NextRequest): string | null {
  // Try to get from Authorization header
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7); // Remove 'Bearer ' prefix
  }
  
  // Try to get from auth_token cookie (JWT token)
  const authToken = request.cookies.get('auth_token')?.value;
  if (authToken) {
    return authToken;
  }
  
  // Try to get from session_id cookie (fallback)
  const cookieHeader = request.headers.get('cookie');
  if (cookieHeader) {
    const match = cookieHeader.match(/session_id=([^;]+)/);
    if (match) {
      return match[1];
    }
  }
  
  return null;
}

/**
 * Validate CSRF protection for request
 * @param request - NextRequest object
 * @returns True if CSRF protection is valid
 */
export async function validateCSRFProtection(request: NextRequest): Promise<boolean> {
  // Skip CSRF validation for GET requests
  if (request.method === 'GET') {
    return true;
  }
  
  const token = await extractCSRFToken(request);
  
  // CRITICAL: Require CSRF token for all state-changing requests
  if (!token) {
    console.warn('CSRF token missing for state-changing request');
    return false;
  }
  
  // Get session ID from request
  const sessionId = extractSessionId(request);
  if (!sessionId) {
    console.warn('No session ID found for CSRF validation');
    return false;
  }
  
  // Validate token using session ID (more secure than iterating all tokens)
  return validateCSRFToken(sessionId, token);
}

/**
 * Generate CSRF token for client-side use
 * @param sessionId - User session identifier
 * @returns Object with CSRF token and metadata
 */
export function generateCSRFTokenForClient(sessionId: string): {
  token: string;
  expiresIn: number;
} {
  const token = generateCSRFToken(sessionId);
  return {
    token,
    expiresIn: 15 * 60 // 15 minutes in seconds
  };
}

/**
 * Clear CSRF token for session
 * @param sessionId - User session identifier
 */
export function clearCSRFToken(sessionId: string): void {
  csrfTokens.delete(sessionId);
}

/**
 * Get CSRF token info for debugging
 * @param sessionId - User session identifier
 * @returns Token info or null
 */
export function getCSRFTokenInfo(sessionId: string): {
  hasToken: boolean;
  expiresAt: number | null;
  isExpired: boolean;
} {
  const token = csrfTokens.get(sessionId);
  
  if (!token) {
    return {
      hasToken: false,
      expiresAt: null,
      isExpired: false
    };
  }
  
  return {
    hasToken: true,
    expiresAt: token.expiresAt,
    isExpired: token.expiresAt < Date.now()
  };
}
