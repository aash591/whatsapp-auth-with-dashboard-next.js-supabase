import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/database/supabaseAdmin';
import { hashPassword } from '@/lib/auth/auth-utils';
import { verifyAccessToken } from '@/lib/auth/jwt';
import { validateDoubleSubmitCSRF } from '@/lib/security/csrf';
import { 
  createSecureErrorResponse, 
  handleDatabaseError, 
  handleValidationError,
  handleCSRFError,
  createGenericErrorResponse,
  sanitizeUserInput
} from '@/lib/security/error-handling';

export async function POST(request: NextRequest) {
  try {
    // CRITICAL: CSRF protection for state-changing operation
    const csrfValid = validateDoubleSubmitCSRF(request);
    if (!csrfValid) {
      return handleCSRFError({
        operation: 'change-password',
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        timestamp: new Date().toISOString()
      });
    }

    // CRITICAL: Validate JWT token to ensure user is authenticated
    const authToken = request.cookies.get('auth_token')?.value;
    
    if (!authToken) {
      return createSecureErrorResponse('AUTH_REQUIRED', 401, {
        operation: 'change-password',
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        timestamp: new Date().toISOString()
      });
    }

    // Verify JWT token
    const sessionData = verifyAccessToken(authToken);
    if (!sessionData || !sessionData.userId) {
      return createSecureErrorResponse('AUTH_INVALID', 401, {
        operation: 'change-password',
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        timestamp: new Date().toISOString()
      });
    }

    const body = await request.json();
    const { newPassword } = body as { newPassword: string };

    // Sanitize user input
    const sanitizedNewPassword = sanitizeUserInput(newPassword);

    // Validate new password strength
    if (sanitizedNewPassword.length < 6) {
      return handleValidationError(['Password must be at least 6 characters long'], {
        operation: 'change-password',
        userId: sessionData.userId,
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        timestamp: new Date().toISOString()
      });
    }

    // Check for at least one letter
    if (!/[a-zA-Z]/.test(sanitizedNewPassword)) {
      return handleValidationError(['Password must contain at least one letter'], {
        operation: 'change-password',
        userId: sessionData.userId,
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        timestamp: new Date().toISOString()
      });
    }

    // Get user data
    const supabaseAdmin = getSupabaseAdmin();
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, phone')
      .eq('phone', sessionData.phone)
      .single();

    if (userError || !userData) {
      return handleDatabaseError(userError, 'change-password', {
        operation: 'change-password',
        userId: sessionData.userId,
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        timestamp: new Date().toISOString()
      });
    }

    // Hash new password
    const newPasswordHash = await hashPassword(sanitizedNewPassword);

    // Update password in database
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({ 
        password_hash: newPasswordHash,
        updated_at: new Date().toISOString()
      })
      .eq('id', userData.id);

    if (updateError) {
      return handleDatabaseError(updateError, 'change-password', {
        operation: 'change-password',
        userId: sessionData.userId,
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        timestamp: new Date().toISOString()
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    return createGenericErrorResponse({
      operation: 'change-password',
      ip: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      timestamp: new Date().toISOString(),
      originalError: error
    });
  }
}
