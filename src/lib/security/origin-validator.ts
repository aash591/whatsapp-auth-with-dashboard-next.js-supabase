/**
 * Origin Validation for CSRF Protection
 * Validates request origin to prevent CSRF attacks
 */

import { NextRequest } from 'next/server';

const ALLOWED_ORIGINS = [
  process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  'https://your-production-domain.com', // Update with your actual domain
];

/**
 * Validate request origin matches allowed origins
 * @param request - Next.js request object
 * @returns True if origin is valid
 */
export function validateOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');

  // For same-origin requests, origin might be null
  if (!origin && !referer) {
    // Allow requests without origin/referer (e.g., server-to-server)
    return true;
  }

  const requestOrigin = origin || (referer ? new URL(referer).origin : null);

  if (!requestOrigin) {
    return false;
  }

  return ALLOWED_ORIGINS.some(allowed => requestOrigin.startsWith(allowed));
}

/**
 * Check if an origin is in the allowed list
 * @param origin - Origin URL to check
 * @returns True if origin is allowed
 */
export function isAllowedOrigin(origin: string): boolean {
  return ALLOWED_ORIGINS.some(allowed => origin.startsWith(allowed));
}



