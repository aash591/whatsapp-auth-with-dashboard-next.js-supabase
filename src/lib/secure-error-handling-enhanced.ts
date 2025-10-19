/**
 * Enhanced Secure Error Handling
 * Prevents information disclosure through comprehensive error sanitization
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
  CODE_EXPIRED: 'Verification code expired',
  
  // Configuration errors
  CONFIG_ERROR: 'Service configuration error',
  
  // Network errors
  NETWORK_ERROR: 'Network error occurred',
  TIMEOUT_ERROR: 'Request timeout',
  
  // File upload errors
  FILE_TOO_LARGE: 'File size exceeds limit',
  INVALID_FILE_TYPE: 'Invalid file type',
  
  // Business logic errors
  ACCOUNT_EXISTS: 'Account already exists',
  ACCOUNT_NOT_FOUND: 'Account not found',
  ACCOUNT_LOCKED: 'Account is locked',
  ACCOUNT_SUSPENDED: 'Account is suspended',
  
  // Session errors
  SESSION_EXPIRED: 'Session expired',
  SESSION_INVALID: 'Invalid session',
  SESSION_REQUIRED: 'Session required'
} as const;

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
  CODE_EXPIRED: 'CODE_EXPIRED',
  CONFIG_ERROR: 'CONFIG_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  INVALID_FILE_TYPE: 'INVALID_FILE_TYPE',
  ACCOUNT_EXISTS: 'ACCOUNT_EXISTS',
  ACCOUNT_NOT_FOUND: 'ACCOUNT_NOT_FOUND',
  ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',
  ACCOUNT_SUSPENDED: 'ACCOUNT_SUSPENDED',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  SESSION_INVALID: 'SESSION_INVALID',
  SESSION_REQUIRED: 'SESSION_REQUIRED'
} as const;

/**
 * Error severity levels
 */
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Error context for logging (server-side only)
 */
interface ErrorContext {
  operation: string;
  userId?: string;
  ip?: string;
  userAgent?: string;
  timestamp: string;
  severity: ErrorSeverity;
  originalError?: any;
}

/**
 * Create secure error response with proper sanitization
 */
export function createSecureErrorResponse(
  errorType: keyof typeof SECURE_ERROR_MESSAGES,
  statusCode: number = 400,
  context?: Partial<ErrorContext>
): NextResponse {
  const message = SECURE_ERROR_MESSAGES[errorType];
  const code = ERROR_CODES[errorType];
  
  // Log error for monitoring (server-side only)
  if (context) {
    logSecurityError(errorType, context);
  }
  
  const response = {
    success: false,
    error: message,
    code,
    // Only include debug info in development
    ...(process.env.NODE_ENV === 'development' && context?.originalError && {
      debug: sanitizeErrorForLogging(context.originalError)
    })
  };
  
  return NextResponse.json(response, { status: statusCode });
}

/**
 * Handle database errors securely
 */
export function handleDatabaseError(
  error: any, 
  operation: string,
  context?: Partial<ErrorContext>
): NextResponse {
  // Log the actual error for debugging (server-side only)
  console.error(`Database error in ${operation}:`, sanitizeErrorForLogging(error));
  
  // Determine appropriate error type based on error
  let errorType: keyof typeof SECURE_ERROR_MESSAGES = 'DATABASE_ERROR';
  
  if (error?.code === 'PGRST116') {
    errorType = 'RECORD_NOT_FOUND';
  } else if (error?.code === '23505') { // Unique constraint violation
    errorType = 'RECORD_EXISTS';
  } else if (error?.code === '23503') { // Foreign key constraint violation
    errorType = 'INVALID_INPUT';
  }
  
  return createSecureErrorResponse(errorType, 500, {
    ...context,
    operation,
    originalError: error,
    severity: ErrorSeverity.HIGH
  });
}

/**
 * Handle authentication errors securely
 */
export function handleAuthError(
  error: any, 
  operation: string,
  context?: Partial<ErrorContext>
): NextResponse {
  // Log the actual error for debugging (server-side only)
  console.error(`Authentication error in ${operation}:`, sanitizeErrorForLogging(error));
  
  return createSecureErrorResponse('AUTH_INVALID', 401, {
    ...context,
    operation,
    originalError: error,
    severity: ErrorSeverity.HIGH
  });
}

/**
 * Handle validation errors securely
 */
export function handleValidationError(
  errors: string[],
  context?: Partial<ErrorContext>
): NextResponse {
  // Don't expose specific validation errors to prevent information disclosure
  return createSecureErrorResponse('INVALID_INPUT', 400, {
    ...context,
    originalError: errors,
    severity: ErrorSeverity.MEDIUM
  });
}

/**
 * Handle rate limiting errors
 */
export function handleRateLimitError(
  retryAfter: number,
  context?: Partial<ErrorContext>
): NextResponse {
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
  
  // Log rate limit event
  if (context) {
    logSecurityError('RATE_LIMIT_EXCEEDED', {
      ...context,
      severity: ErrorSeverity.MEDIUM
    });
  }
  
  return response;
}

/**
 * Handle CSRF errors securely
 */
export function handleCSRFError(context?: Partial<ErrorContext>): NextResponse {
  return createSecureErrorResponse('CSRF_INVALID', 403, {
    ...context,
    severity: ErrorSeverity.HIGH
  });
}

/**
 * Handle WhatsApp service errors securely
 */
export function handleWhatsAppError(
  error: any, 
  operation: string,
  context?: Partial<ErrorContext>
): NextResponse {
  // Log the actual error for debugging (server-side only)
  console.error(`WhatsApp error in ${operation}:`, sanitizeErrorForLogging(error));
  
  return createSecureErrorResponse('WHATSAPP_ERROR', 500, {
    ...context,
    operation,
    originalError: error,
    severity: ErrorSeverity.MEDIUM
  });
}

/**
 * Handle verification errors securely
 */
export function handleVerificationError(
  errorType: 'CODE_INVALID' | 'CODE_EXPIRED' | 'VERIFICATION_FAILED',
  context?: Partial<ErrorContext>
): NextResponse {
  const statusCode = errorType === 'CODE_EXPIRED' ? 410 : 400;
  return createSecureErrorResponse(errorType, statusCode, {
    ...context,
    severity: ErrorSeverity.MEDIUM
  });
}

/**
 * Handle configuration errors securely
 */
export function handleConfigError(
  error: any,
  operation: string,
  context?: Partial<ErrorContext>
): NextResponse {
  // Log the actual error for debugging (server-side only)
  console.error(`Configuration error in ${operation}:`, sanitizeErrorForLogging(error));
  
  return createSecureErrorResponse('CONFIG_ERROR', 500, {
    ...context,
    operation,
    originalError: error,
    severity: ErrorSeverity.CRITICAL
  });
}

/**
 * Handle network errors securely
 */
export function handleNetworkError(
  error: any,
  operation: string,
  context?: Partial<ErrorContext>
): NextResponse {
  console.error(`Network error in ${operation}:`, sanitizeErrorForLogging(error));
  
  return createSecureErrorResponse('NETWORK_ERROR', 503, {
    ...context,
    operation,
    originalError: error,
    severity: ErrorSeverity.MEDIUM
  });
}

/**
 * Handle timeout errors securely
 */
export function handleTimeoutError(
  operation: string,
  context?: Partial<ErrorContext>
): NextResponse {
  return createSecureErrorResponse('TIMEOUT_ERROR', 408, {
    ...context,
    operation,
    severity: ErrorSeverity.MEDIUM
  });
}

/**
 * Handle business logic errors securely
 */
export function handleBusinessLogicError(
  errorType: 'ACCOUNT_EXISTS' | 'ACCOUNT_NOT_FOUND' | 'ACCOUNT_LOCKED' | 'ACCOUNT_SUSPENDED',
  context?: Partial<ErrorContext>
): NextResponse {
  const statusCode = errorType === 'ACCOUNT_NOT_FOUND' ? 404 : 
                    errorType === 'ACCOUNT_EXISTS' ? 409 : 403;
  
  return createSecureErrorResponse(errorType, statusCode, {
    ...context,
    severity: ErrorSeverity.MEDIUM
  });
}

/**
 * Handle session errors securely
 */
export function handleSessionError(
  errorType: 'SESSION_EXPIRED' | 'SESSION_INVALID' | 'SESSION_REQUIRED',
  context?: Partial<ErrorContext>
): NextResponse {
  const statusCode = errorType === 'SESSION_REQUIRED' ? 401 : 403;
  
  return createSecureErrorResponse(errorType, statusCode, {
    ...context,
    severity: ErrorSeverity.MEDIUM
  });
}

/**
 * Sanitize error for logging (remove sensitive information)
 */
export function sanitizeErrorForLogging(error: any): any {
  if (!error) return error;
  
  const sanitized = { ...error };
  
  // Remove sensitive fields
  const sensitiveFields = [
    'password', 'password_hash', 'token', 'secret', 'key',
    'authorization', 'cookie', 'session', 'auth',
    'jwt', 'csrf', 'api_key', 'access_token',
    'refresh_token', 'private_key', 'client_secret'
  ];
  
  // Remove top-level sensitive fields
  sensitiveFields.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  });
  
  // Remove nested sensitive fields
  if (sanitized.message && typeof sanitized.message === 'string') {
    let message = sanitized.message;
    sensitiveFields.forEach(field => {
      const regex = new RegExp(`${field}[^,}]*`, 'gi');
      message = message.replace(regex, `${field}=[REDACTED]`);
    });
    sanitized.message = message;
  }
  
  // Remove stack traces in production
  if (process.env.NODE_ENV === 'production' && sanitized.stack) {
    delete sanitized.stack;
  }
  
  // Remove internal error details
  if (sanitized.code && typeof sanitized.code === 'string') {
    // Only keep generic error codes
    if (sanitized.code.startsWith('PGRST') || sanitized.code.startsWith('235')) {
      sanitized.code = '[DATABASE_ERROR]';
    }
  }
  
  return sanitized;
}

/**
 * Log security error for monitoring
 */
function logSecurityError(
  errorType: string,
  context: Partial<ErrorContext>
): void {
  const logEntry = {
    type: 'SECURITY_ERROR',
    errorType,
    timestamp: new Date().toISOString(),
    severity: context.severity || ErrorSeverity.MEDIUM,
    operation: context.operation,
    userId: context.userId,
    ip: context.ip,
    userAgent: context.userAgent,
    // Only log sanitized error details
    sanitizedError: context.originalError ? 
      sanitizeErrorForLogging(context.originalError) : undefined
  };
  
  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.warn('🔒 Security Error:', logEntry);
  }
  
  // In production, you might want to send this to a monitoring service
  // like DataDog, New Relic, or CloudWatch
  if (process.env.NODE_ENV === 'production') {
    // Example: Send to monitoring service
    // monitoringService.logError(logEntry);
  }
}

/**
 * Create a generic error response for unexpected errors
 */
export function createGenericErrorResponse(
  context?: Partial<ErrorContext>
): NextResponse {
  return createSecureErrorResponse('INTERNAL_ERROR', 500, {
    ...context,
    severity: ErrorSeverity.HIGH
  });
}

/**
 * Validate and sanitize user input
 */
export function sanitizeUserInput(input: any): any {
  if (typeof input === 'string') {
    // Remove potential XSS vectors
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<[^>]*>/g, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .trim();
  }
  
  if (Array.isArray(input)) {
    return input.map(sanitizeUserInput);
  }
  
  if (input && typeof input === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(input)) {
      // Skip sensitive fields
      if (['password', 'token', 'secret', 'key'].includes(key.toLowerCase())) {
        continue;
      }
      sanitized[key] = sanitizeUserInput(value);
    }
    return sanitized;
  }
  
  return input;
}
