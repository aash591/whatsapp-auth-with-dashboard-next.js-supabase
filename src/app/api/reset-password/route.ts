import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { validatePhoneNumber } from '@/lib/security';
import { generateVerificationCode } from '@/lib/utils';
import { generateSecureToken } from '@/utils/secureAuth';
import { validateDoubleSubmitCSRF } from '@/lib/csrf-double-submit'; // Double Submit Cookie CSRF protection
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
    // Double Submit Cookie CSRF protection
    const csrfValid = validateDoubleSubmitCSRF(request);
    if (!csrfValid) {
      return handleCSRFError({
        operation: 'reset-password',
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        timestamp: new Date().toISOString()
      });
    }

    const { phone } = await request.json();

    // Sanitize user input
    const sanitizedPhone = sanitizeUserInput(phone);

    // Validate phone number
    let validatedPhone: string;
    
    try {
      validatedPhone = validatePhoneNumber(sanitizedPhone);
    } catch (error: any) {
      return handleValidationError([error.message], {
        operation: 'reset-password',
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        timestamp: new Date().toISOString(),
        originalError: error
      });
    }

    // Check if user exists in users table
    const supabaseAdmin = getSupabaseAdmin();
    const { data: existingUser, error: userCheckError } = await supabaseAdmin
      .from('users')
      .select('id, name, phone, verified')
      .eq('phone', validatedPhone)
      .eq('verified', true)
      .single();

    if (userCheckError || !existingUser) {
      return createSecureErrorResponse('ACCOUNT_NOT_FOUND', 404, {
        operation: 'reset-password',
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        timestamp: new Date().toISOString()
      });
    }

    // Generate unique verification code for password reset
    let code = generateVerificationCode();
    let attempts = 0;
    let codeExists = true;

    while (codeExists && attempts < 10) {
      const { data } = await supabaseAdmin
        .from('verification_codes')
        .select('code')
        .eq('code', code)
        .single();

      if (!data) {
        codeExists = false;
      } else {
        code = generateVerificationCode();
        attempts++;
      }
    }

    // Insert verification code for password reset
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    
    const { data, error } = await supabaseAdmin
      .from('verification_codes')
      .insert({
        code,
        name: existingUser.name,
        whatsapp_number: validatedPhone,
        verified: false,
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (error) {
      return handleDatabaseError(error, 'reset-password', {
        operation: 'reset-password',
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        timestamp: new Date().toISOString()
      });
    }

    // Generate secure token for the reset flow
    const secureToken = generateSecureToken({
      code: data.code,
      name: existingUser.name,
      whatsappNumber: validatedPhone,
      verified: false,
    });
    
    const response = NextResponse.json({ 
      success: true, 
      code: data.code,
      message: 'Reset code sent to WhatsApp'
    });
    
    // Set cookie for the reset flow
    response.headers.set(
      'Set-Cookie',
      `auth_token=${secureToken}; HttpOnly; Secure; Path=/; Max-Age=${24 * 60 * 60}; SameSite=Strict`
    );

    return response;

  } catch (error) {
    return createGenericErrorResponse({
      operation: 'reset-password',
      ip: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      timestamp: new Date().toISOString(),
      originalError: error
    });
  }
}
