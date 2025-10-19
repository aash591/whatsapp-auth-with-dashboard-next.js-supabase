import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { generateSecureToken } from '@/utils/secureAuth';
import { hashPassword, validatePassword } from '@/lib/auth-utils';
import { verifySecureToken } from '@/utils/secureAuth';
import { validateDoubleSubmitCSRF } from '@/lib/csrf-double-submit';
import { applyAPISecurityHeaders } from '@/lib/security-headers';
import { 
  createSecureErrorResponse, 
  handleDatabaseError, 
  handleAuthError, 
  handleValidationError,
  handleCSRFError,
  createGenericErrorResponse,
  sanitizeUserInput
} from '@/lib/secure-error-handling-enhanced';

export async function POST(request: NextRequest) {
  try {
    // CRITICAL: CSRF protection for state-changing operation
    const csrfValid = validateDoubleSubmitCSRF(request);
    if (!csrfValid) {
      return handleCSRFError({
        operation: 'set-password',
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        timestamp: new Date().toISOString()
      });
    }

    // CRITICAL: Validate JWT token to ensure user is authenticated
    const authToken = request.cookies.get('auth_token')?.value;
    
    if (!authToken) {
      return createSecureErrorResponse('AUTH_REQUIRED', 401, {
        operation: 'set-password',
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        timestamp: new Date().toISOString()
      });
    }

    // Verify JWT token
    const sessionData = verifySecureToken(authToken);
    if (!sessionData) {
      return createSecureErrorResponse('AUTH_INVALID', 401, {
        operation: 'set-password',
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        timestamp: new Date().toISOString()
      });
    }

    const { password, code } = await request.json();

    // Sanitize user input
    const sanitizedPassword = sanitizeUserInput(password);
    const sanitizedCode = sanitizeUserInput(code);

    // Validate password strength
    const passwordValidation = validatePassword(sanitizedPassword);
    if (!passwordValidation.isValid) {
      return handleValidationError(passwordValidation.errors, {
        operation: 'set-password',
        userId: sessionData.code,
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        timestamp: new Date().toISOString(),
        originalError: passwordValidation.errors
      });
    }

    // CRITICAL: Validate that the user is authorized to set password for this code
    // The JWT token must contain the same code that the user is trying to set password for
    if (sessionData.code !== sanitizedCode) {
      return createSecureErrorResponse('UNAUTHORIZED', 403, {
        operation: 'set-password',
        userId: sessionData.code,
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        timestamp: new Date().toISOString()
      });
    }

    // Check if user is verified and get their phone number
    const supabaseAdmin = getSupabaseAdmin();
    const { data: verificationData, error: verificationError } = await supabaseAdmin
      .from('verification_codes')
      .select('*')
      .eq('code', sanitizedCode)
      .eq('verified', true)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (verificationError || !verificationData) {
      return handleDatabaseError(verificationError, 'set-password', {
        operation: 'set-password',
        userId: sessionData.code,
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        timestamp: new Date().toISOString()
      });
    }

    // Get the phone number from verification data
    const validatedPhone = verificationData.whatsapp_number;

    // Hash the password using bcrypt
    const passwordHash = await hashPassword(sanitizedPassword);

    // Check if user already exists in users table
    const { data: existingUser, error: userCheckError } = await supabaseAdmin
      .from('users')
      .select('id, password_hash')
      .eq('phone', validatedPhone)
      .single();

    if (userCheckError && userCheckError.code !== 'PGRST116') {
      return handleDatabaseError(userCheckError, 'set-password', {
        operation: 'set-password',
        userId: sessionData.code,
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        timestamp: new Date().toISOString()
      });
    }

    let userId: string;

    if (existingUser) {
      // Update existing user's password (for both new users and password reset)
      const { error: updateError } = await supabaseAdmin
        .from('users')
        .update({ 
          password_hash: passwordHash,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingUser.id);

      if (updateError) {
        return handleDatabaseError(updateError, 'set-password', {
          operation: 'set-password',
          userId: sessionData.code,
          ip: request.headers.get('x-forwarded-for') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
          timestamp: new Date().toISOString()
        });
      }

      userId = existingUser.id;
    } else {
      // Create new user
      const { data: newUser, error: createError } = await supabaseAdmin
        .from('users')
        .insert({
          phone: validatedPhone,
          name: verificationData.name,
          password_hash: passwordHash,
          verified: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select('id')
        .single();

      if (createError) {
        return handleDatabaseError(createError, 'set-password', {
          operation: 'set-password',
          userId: sessionData.code,
          ip: request.headers.get('x-forwarded-for') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
          timestamp: new Date().toISOString()
        });
      }

      userId = newUser.id;
    }

    // Generate new secure token with password authentication
    const secureToken = generateSecureToken({
      code: verificationData.code,
      name: verificationData.name,
      whatsappNumber: verificationData.whatsapp_number,
      verified: true,
    });

    const response = NextResponse.json({
      success: true,
      message: 'Password set successfully',
      user: {
        id: userId,
        name: verificationData.name,
        phone: validatedPhone
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
      operation: 'set-password',
      ip: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      timestamp: new Date().toISOString(),
      originalError: error
    });
  }
}
