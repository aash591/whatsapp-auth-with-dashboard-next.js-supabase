/**
 * Security Headers Configuration
 * Provides comprehensive security headers for all responses
 */

import { NextResponse } from 'next/server';

/**
 * Security headers configuration
 */
export const SECURITY_HEADERS = {
  // Prevent XSS attacks
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  
  // Content Security Policy
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Required for Next.js
    "style-src 'self' 'unsafe-inline'", // Required for Tailwind CSS
    "img-src 'self' data: https:",
    "font-src 'self'",
    "connect-src 'self' https://api.whatsapp.com https://*.supabase.co",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    "media-src 'self'",
    "worker-src 'self'"
  ].join('; '),
  
  // Referrer Policy
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  
  // Permissions Policy
  'Permissions-Policy': [
    'camera=()',
    'microphone=()',
    'geolocation=()',
    'interest-cohort=()',
    'payment=()',
    'usb=()',
    'magnetometer=()',
    'gyroscope=()',
    'accelerometer=()'
  ].join(', '),
  
  // HSTS (only in production)
  ...(process.env.NODE_ENV === 'production' ? {
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload'
  } : {}),
  
  // Additional security headers
  'Cross-Origin-Embedder-Policy': 'require-corp',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin'
};

/**
 * Apply security headers to response
 * @param response - NextResponse object
 * @returns Response with security headers applied
 */
export function applySecurityHeaders(response: NextResponse): NextResponse {
  // Apply all security headers
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  
  return response;
}

/**
 * Create secure response with security headers
 * @param data - Response data
 * @param status - HTTP status code
 * @returns Secure NextResponse
 */
export function createSecureResponse(data: any, status: number = 200): NextResponse {
  const response = NextResponse.json(data, { status });
  return applySecurityHeaders(response);
}

/**
 * Security headers for API routes
 */
export const API_SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0'
};

/**
 * Apply API security headers
 * @param response - NextResponse object
 * @returns Response with API security headers
 */
export function applyAPISecurityHeaders(response: NextResponse): NextResponse {
  Object.entries(API_SECURITY_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  
  return response;
}
