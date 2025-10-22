import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/database/supabaseAdmin';
import { generateAccessToken } from '@/lib/auth/jwt';
import { comparePassword, normalizePhoneNumber, validatePhoneNumber } from '@/lib/auth/auth-utils';
import { validateDoubleSubmitCSRF } from '@/lib/security/csrf';
import { applyAPISecurityHeaders } from '@/lib/security/security-headers';
import crypto from 'crypto';
import { 
  createSecureErrorResponse, 
  handleValidationError,
  handleCSRFError,
  createGenericErrorResponse,
  sanitizeUserInput
} from '@/lib/security/error-handling';

/**
 * API Route: User Sign In
 * POST /api/auth/signin
 * Handles user authentication with phone and password
 */
export async function POST(request: NextRequest) {
  try {
    // CRITICAL: CSRF protection for state-changing operation
    const csrfValid = validateDoubleSubmitCSRF(request);
    if (!csrfValid) {
      return handleCSRFError({
        operation: 'signin',
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        timestamp: new Date().toISOString()
      });
    }

    const body = await request.json();
    const { phone, password } = body as { phone: string; password: string };

    // Sanitize user input
    const sanitizedPhone = sanitizeUserInput(phone);
    const sanitizedPassword = sanitizeUserInput(password);

    // Validate phone number
    const phoneValidation = validatePhoneNumber(sanitizedPhone);
    if (!phoneValidation.isValid) {
      return handleValidationError(phoneValidation.errors, {
        operation: 'signin',
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        timestamp: new Date().toISOString()
      });
    }

    // Normalize phone number for database lookup
    const normalizedPhone = normalizePhoneNumber(sanitizedPhone);

    // Validate password presence
    if (!sanitizedPassword || sanitizedPassword.length === 0) {
      return handleValidationError(['Password is required'], {
        operation: 'signin',
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        timestamp: new Date().toISOString()
      });
    }

    // Look up user in database
    const supabaseAdmin = getSupabaseAdmin();
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, name, phone, password_hash, verified, is_fraudulent, referral_code')
      .eq('phone', normalizedPhone)
      .single();

    if (userError || !userData) {
      // Don't reveal if user exists or not for security
      return createSecureErrorResponse('AUTH_INVALID', 401, {
        operation: 'signin',
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        timestamp: new Date().toISOString()
      });
    }

    // Check if user is verified
    if (!userData.verified) {
      return createSecureErrorResponse('AUTH_INVALID', 401, {
        operation: 'signin',
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        timestamp: new Date().toISOString()
      });
    }

    // Check if user is flagged as fraudulent
    if (userData.is_fraudulent) {
      return createSecureErrorResponse('FORBIDDEN', 403, {
        operation: 'signin',
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        timestamp: new Date().toISOString()
      });
    }

    // Verify password
    if (!userData.password_hash) {
      return createSecureErrorResponse('AUTH_INVALID', 401, {
        operation: 'signin',
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        timestamp: new Date().toISOString()
      });
    }

    const passwordValid = await comparePassword(sanitizedPassword, userData.password_hash);
    if (!passwordValid) {
      return createSecureErrorResponse('AUTH_INVALID', 401, {
        operation: 'signin',
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        timestamp: new Date().toISOString()
      });
    }

    // Generate new session ID for session regeneration
    const sessionId = crypto.randomBytes(32).toString('hex');
    
    // Invalidate any existing sessions for this user (optional - for extra security)
    // Note: Since we're using JWT-only for users, we can't easily invalidate old tokens
    // But we can add session tracking in the future if needed
    
    // Generate JWT token with session ID
    const token = generateAccessToken({
      userId: userData.id,
      username: userData.name,
      phone: userData.phone,
      role: 'user',
      sessionId: sessionId,
    });

    // Create response
    const response = NextResponse.json(
      { 
        success: true, 
        message: 'Sign in successful',
        user: {
          id: userData.id,
          name: userData.name,
          phone: userData.phone,
          referral_code: userData.referral_code,
        }
      },
      { status: 200 }
    );

    // Set JWT cookie (24 hours)
    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: true, // Always secure for HTTPS
      sameSite: 'strict',
      maxAge: 60 * 60 * 24, // 24 hours
      path: '/',
    });

    return applyAPISecurityHeaders(response);
  } catch (error) {
    return createGenericErrorResponse({
      operation: 'signin',
      ip: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      timestamp: new Date().toISOString(),
      originalError: error
    });
  }
}
