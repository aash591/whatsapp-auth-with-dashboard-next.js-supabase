import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { validatePhoneNumber, validatePassword } from '@/lib/security';
import { generateSecureToken } from '@/utils/secureAuth';
import { comparePassword } from '@/lib/auth-utils';
import { validateDoubleSubmitCSRF } from '@/lib/csrf-double-submit'; // Double Submit Cookie CSRF protection
import { checkRateLimit, createRateLimitResponse } from '@/lib/rate-limiting';
import { applyAPISecurityHeaders } from '@/lib/security-headers';
import { 
  createSecureErrorResponse, 
  handleDatabaseError, 
  handleAuthError, 
  handleValidationError,
  handleRateLimitError,
  handleCSRFError,
  createGenericErrorResponse,
  sanitizeUserInput
} from '@/lib/secure-error-handling-enhanced';

export async function POST(request: NextRequest) {
  try {
    // Rate limiting for authentication attempts
    const rateLimit = checkRateLimit(request, 'auth');
    if (!rateLimit.allowed) {
      return handleRateLimitError(rateLimit.retryAfter || 900, {
        operation: 'auth-password',
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        timestamp: new Date().toISOString()
      });
    }

    // Double Submit Cookie CSRF protection
    const csrfValid = validateDoubleSubmitCSRF(request);
    if (!csrfValid) {
      return handleCSRFError({
        operation: 'auth-password',
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        timestamp: new Date().toISOString()
      });
    }

    const { phone, password } = await request.json();

    // Sanitize user input
    const sanitizedPhone = sanitizeUserInput(phone);
    const sanitizedPassword = sanitizeUserInput(password);

    // Validate inputs
    let validatedPhone: string;
    
    try {
      validatedPhone = validatePhoneNumber(sanitizedPhone);
    } catch (error: any) {
      return handleValidationError([error.message], {
        operation: 'auth-password',
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        timestamp: new Date().toISOString(),
        originalError: error
      });
    }

    // Validate password strength
    try {
      validatePassword(sanitizedPassword);
    } catch (error: any) {
      return handleValidationError([error.message], {
        operation: 'auth-password',
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        timestamp: new Date().toISOString(),
        originalError: error
      });
    }

    // Find user by phone
    const supabaseAdmin = getSupabaseAdmin();
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, name, phone, password_hash, verified')
      .eq('phone', validatedPhone)
      .eq('verified', true)
      .single();

    if (userError || !user) {
      return handleAuthError(userError, 'auth-password', {
        operation: 'auth-password',
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        timestamp: new Date().toISOString()
      });
    }

    // Verify password using bcrypt
    const isPasswordValid = await comparePassword(sanitizedPassword, user.password_hash);
    
    if (!isPasswordValid) {
      return handleAuthError(new Error('Invalid password'), 'auth-password', {
        operation: 'auth-password',
        userId: user.id,
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        timestamp: new Date().toISOString()
      });
    }

    // Generate secure token with cryptographically secure random session ID
    // CRITICAL: Never use predictable user IDs as tokens
    const crypto = require('crypto');
    const sessionId = crypto.randomBytes(64).toString('hex'); // 128-character random string for maximum security
    
    // Generate JWT with secure random session ID (no database storage needed)
    const secureToken = generateSecureToken({
      code: sessionId, // Use cryptographically secure random session ID
      name: user.name,
      whatsappNumber: user.phone,
      verified: true,
    });

    const response = NextResponse.json({
      success: true,
      message: 'Authentication successful',
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone
      }
    });

    // Set secure cookie with shorter expiration for security
    response.headers.set(
      'Set-Cookie',
      `auth_token=${secureToken}; HttpOnly; Secure; Path=/; Max-Age=${60 * 60}; SameSite=Strict`
    );

    return applyAPISecurityHeaders(response);

  } catch (error) {
    return createGenericErrorResponse({
      operation: 'auth-password',
      ip: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      timestamp: new Date().toISOString(),
      originalError: error
    });
  }
}
