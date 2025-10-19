/**
 * Secure Error Handling
 * Prevents information disclosure through error messages
 */

import { NextResponse } from 'next/server';

/**
 * Generic error messages to prevent information disclosure
 */
export const SECURE_ERROR_MESSAGES = {
  // Authentication errors
  AUTH_REQUIRED: 'Authentication required',
  AUTH_INVALID: 'Invalid authentication credentials',
  AUTH_EXPIRED: 'Authentication session expired',
  
  // Authorization errors
  UNAUTHORIZED: 'You are not authorized to perform this action',
  FORBIDDEN: 'Access denied',
  
  // Validation errors
  INVALID_INPUT: 'Invalid input provided',
  MISSING_REQUIRED_FIELD: 'Required field is missing',
  INVALID_FORMAT: 'Invalid format provided',
  
  // Rate limiting
  RATE_LIMIT_EXCEEDED: 'Too many requests. Please try again later.',
  
  // CSRF protection
  CSRF_INVALID: 'Invalid security token. Please refresh and try again.',
  
  // Generic errors
  INTERNAL_ERROR: 'An internal error occurred',
  SERVICE_UNAVAILABLE: 'Service temporarily unavailable',
  
  // Database errors (generic)
  DATABASE_ERROR: 'Database operation failed',
  RECORD_NOT_FOUND: 'Record not found',
  RECORD_EXISTS: 'Record already exists',
  
  // WhatsApp specific
  WHATSAPP_ERROR: 'WhatsApp service error',
  VERIFICATION_FAILED: 'Verification failed',
  CODE_INVALID: 'Invalid verification code',
  CODE_EXPIRED: 'Verification code expired'
};

/**
 * Error codes for client-side handling
 */
export const ERROR_CODES = {
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  AUTH_INVALID: 'AUTH_INVALID',
  AUTH_EXPIRED: 'AUTH_EXPIRED',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  INVALID_FORMAT: 'INVALID_FORMAT',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  CSRF_INVALID: 'CSRF_INVALID',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  DATABASE_ERROR: 'DATABASE_ERROR',
  RECORD_NOT_FOUND: 'RECORD_NOT_FOUND',
  RECORD_EXISTS: 'RECORD_EXISTS',
  WHATSAPP_ERROR: 'WHATSAPP_ERROR',
  VERIFICATION_FAILED: 'VERIFICATION_FAILED',
  CODE_INVALID: 'CODE_INVALID',
  CODE_EXPIRED: 'CODE_EXPIRED'
} as const;

/**
 * Create secure error response
 * @param errorType - Type of error
 * @param statusCode - HTTP status code
 * @param additionalInfo - Additional information (only in development)
 * @returns Secure error response
 */
export function createSecureErrorResponse(
  errorType: keyof typeof SECURE_ERROR_MESSAGES,
  statusCode: number = 400,
  additionalInfo?: string
): NextResponse {
  const message = SECURE_ERROR_MESSAGES[errorType];
  const code = ERROR_CODES[errorType];
  
  const response = {
    success: false,
    error: message,
    code,
    ...(process.env.NODE_ENV === 'development' && additionalInfo && {
      debug: additionalInfo
    })
  };
  
  return NextResponse.json(response, { status: statusCode });
}

/**
 * Handle database errors securely
 * @param error - Database error
 * @param operation - Operation being performed
 * @returns Secure error response
 */
export function handleDatabaseError(error: any, operation: string): NextResponse {
  // Log the actual error for debugging (server-side only)
  console.error(`Database error in ${operation}:`, error);
  
  // Return generic error to client
  return createSecureErrorResponse('DATABASE_ERROR', 500);
}

/**
 * Handle authentication errors securely
 * @param error - Authentication error
 * @param operation - Operation being performed
 * @returns Secure error response
 */
export function handleAuthError(error: any, operation: string): NextResponse {
  // Log the actual error for debugging (server-side only)
  console.error(`Authentication error in ${operation}:`, error);
  
  // Return generic error to client
  return createSecureErrorResponse('AUTH_INVALID', 401);
}

/**
 * Handle validation errors securely
 * @param errors - Validation errors
 * @returns Secure error response
 */
export function handleValidationError(errors: string[]): NextResponse {
  // Don't expose specific validation errors to prevent information disclosure
  return createSecureErrorResponse('INVALID_INPUT', 400);
}

/**
 * Handle rate limiting errors
 * @param retryAfter - Seconds to wait before retry
 * @returns Rate limit error response
 */
export function handleRateLimitError(retryAfter: number): NextResponse {
  const response = NextResponse.json(
    {
      success: false,
      error: SECURE_ERROR_MESSAGES.RATE_LIMIT_EXCEEDED,
      code: ERROR_CODES.RATE_LIMIT_EXCEEDED,
      retryAfter
    },
    {
      status: 429,
      headers: {
        'Retry-After': retryAfter.toString()
      }
    }
  );
  
  return response;
}

/**
 * Handle CSRF errors securely
 * @returns CSRF error response
 */
export function handleCSRFError(): NextResponse {
  return createSecureErrorResponse('CSRF_INVALID', 403);
}

/**
 * Handle WhatsApp service errors securely
 * @param error - WhatsApp error
 * @param operation - Operation being performed
 * @returns Secure error response
 */
export function handleWhatsAppError(error: any, operation: string): NextResponse {
  // Log the actual error for debugging (server-side only)
  console.error(`WhatsApp error in ${operation}:`, error);
  
  // Return generic error to client
  return createSecureErrorResponse('WHATSAPP_ERROR', 500);
}

/**
 * Handle verification errors securely
 * @param errorType - Type of verification error
 * @returns Secure error response
 */
export function handleVerificationError(errorType: 'CODE_INVALID' | 'CODE_EXPIRED' | 'VERIFICATION_FAILED'): NextResponse {
  const statusCode = errorType === 'CODE_EXPIRED' ? 410 : 400;
  return createSecureErrorResponse(errorType, statusCode);
}

/**
 * Sanitize error for logging (remove sensitive information)
 * @param error - Error object
 * @returns Sanitized error object
 */
export function sanitizeErrorForLogging(error: any): any {
  if (!error) return error;
  
  const sanitized = { ...error };
  
  // Remove sensitive fields
  const sensitiveFields = [
    'password', 'password_hash', 'token', 'secret', 'key',
    'authorization', 'cookie', 'session', 'auth'
  ];
  
  sensitiveFields.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  });
  
  // Remove nested sensitive fields
  if (sanitized.message && typeof sanitized.message === 'string') {
    sanitized.message = sanitized.message.replace(/password[^,}]*/gi, 'password=[REDACTED]');
    sanitized.message = sanitized.message.replace(/token[^,}]*/gi, 'token=[REDACTED]');
  }
  
  return sanitized;
}
