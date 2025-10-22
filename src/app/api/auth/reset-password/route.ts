import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/database/supabaseAdmin';
import { validatePhoneNumber, normalizePhoneNumber } from '@/lib/auth/auth-utils';
import { generateVerificationCode } from '@/lib/utils';
import { validateDoubleSubmitCSRF } from '@/lib/security/csrf'; // Double Submit Cookie CSRF protection
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

    const body = await request.json();
    const { phone } = body as { phone: string };

    // Sanitize user input
    const sanitizedPhone = sanitizeUserInput(phone);
    
    // Normalize phone number (add + if missing)
    const normalizedPhone = normalizePhoneNumber(sanitizedPhone);

    // Validate phone number
    const phoneValidation = validatePhoneNumber(normalizedPhone);
    if (!phoneValidation.isValid) {
      return handleValidationError(phoneValidation.errors, {
        operation: 'reset-password',
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        timestamp: new Date().toISOString()
      });
    }

    // Check if user exists in users table
    const supabaseAdmin = getSupabaseAdmin();
    const { data: existingUser, error: userCheckError } = await supabaseAdmin
      .from('users')
      .select('id, name, phone, verified')
      .eq('phone', normalizedPhone)
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
        whatsapp_number: normalizedPhone,
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

    const response = NextResponse.json({ 
      success: true, 
      code: data.code,
      message: 'Reset code sent to WhatsApp'
    });
    
    // Set verification_phone cookie for the verify page (expires in 15 minutes)
    response.cookies.set('verification_phone', normalizedPhone, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 15, // 15 minutes
      path: '/',
    });

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
