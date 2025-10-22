import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/database/supabaseAdmin';
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

    const body = await request.json();
    const { code } = body as { code: string };

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

    // Create or update user record with referral code
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('phone', verificationData.whatsapp_number)
      .single();

    if (!existingUser) {
      // Create new user with referral code (password optional)
      const { error: userError } = await supabaseAdmin
        .from('users')
        .insert({
          phone: verificationData.whatsapp_number,
          name: verificationData.name,
          referral_code: verificationData.code, // Use verification code as referral code
          verified: true,
          verified_at: new Date().toISOString(),
          // password_hash is optional - user can set password later if desired
        });

      if (userError) {
        return handleDatabaseError(userError, 'verify-and-auth', {
          operation: 'verify-and-auth',
          ip: request.headers.get('x-forwarded-for') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
          timestamp: new Date().toISOString()
        });
      }
    }

    // DO NOT generate JWT here - JWT only issued after password is set!
    // Simply return verification status
    return NextResponse.json({
      success: true,
      data: {
        code: verificationData.code,
        name: verificationData.name,
        verified: true,
      },
    });
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
