import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { generateSecureToken } from '@/utils/secureAuth';
import { validateDoubleSubmitCSRF } from '@/lib/csrf-double-submit';
import { 
  createSecureErrorResponse, 
  handleDatabaseError, 
  handleValidationError,
  handleCSRFError,
  createGenericErrorResponse,
  sanitizeUserInput
} from '@/lib/secure-error-handling-enhanced';

export async function POST(request: NextRequest) {
  try {
    // CRITICAL: CSRF protection for authentication operation
    const csrfValid = validateDoubleSubmitCSRF(request);
    if (!csrfValid) {
      return handleCSRFError({
        operation: 'verify-and-auth',
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        timestamp: new Date().toISOString()
      });
    }

    const { code } = await request.json();

    // Sanitize user input
    const sanitizedCode = sanitizeUserInput(code);

    if (!sanitizedCode) {
      return handleValidationError(['Verification code is required'], {
        operation: 'verify-and-auth',
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        timestamp: new Date().toISOString()
      });
    }

    // Check if the verification code exists and is verified
    const supabaseAdmin = getSupabaseAdmin();
    const { data: verificationData, error } = await supabaseAdmin
      .from('verification_codes')
      .select('*')
      .eq('code', sanitizedCode)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error || !verificationData) {
      return handleDatabaseError(error, 'verify-and-auth', {
        operation: 'verify-and-auth',
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        timestamp: new Date().toISOString()
      });
    }

    if (!verificationData.verified) {
      return createSecureErrorResponse('VERIFICATION_FAILED', 400, {
        operation: 'verify-and-auth',
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        timestamp: new Date().toISOString()
      });
    }

    // Generate JWT token for the verified user
    const secureToken = generateSecureToken({
      code: verificationData.code,
      name: verificationData.name,
      whatsappNumber: verificationData.whatsapp_number,
      verified: true,
    });

    // Set the JWT token as an HTTP-only cookie
    const response = NextResponse.json({
      success: true,
      data: {
        code: verificationData.code,
        name: verificationData.name,
        verified: true,
      },
    });

    response.headers.set(
      'Set-Cookie',
      `auth_token=${secureToken}; HttpOnly; Secure; Path=/; Max-Age=${60 * 60}; SameSite=Strict`
    );

    return response;
  } catch (error) {
    return createGenericErrorResponse({
      operation: 'verify-and-auth',
      ip: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      timestamp: new Date().toISOString(),
      originalError: error
    });
  }
}
