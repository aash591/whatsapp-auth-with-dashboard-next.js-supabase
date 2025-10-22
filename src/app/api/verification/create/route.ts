import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/database/supabaseAdmin';
import { generateVerificationCode } from '@/lib/utils';
import { validatePhoneNumber, validateName, normalizePhoneNumber } from '@/lib/auth/auth-utils';
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
        operation: 'generate-code',
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        timestamp: new Date().toISOString()
      });
    }

    const body = await request.json();
    const { name, whatsappNumber, referralCode } = body as { name: string; whatsappNumber: string; referralCode?: string };

    // Sanitize user input
    const sanitizedName = sanitizeUserInput(name);
    const sanitizedNumber = sanitizeUserInput(whatsappNumber);
    const sanitizedReferralCode = referralCode ? sanitizeUserInput(referralCode).toUpperCase().trim() : null;
    
    // Normalize phone number (add + if missing)
    const normalizedPhone = normalizePhoneNumber(sanitizedNumber);

    // Validate inputs
    const nameValidation = validateName(sanitizedName);
    const phoneValidation = validatePhoneNumber(normalizedPhone);
    
    const validationErrors = [...nameValidation.errors, ...phoneValidation.errors];
    if (validationErrors.length > 0) {
      return handleValidationError(validationErrors, {
        operation: 'generate-code',
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        timestamp: new Date().toISOString()
      });
    }

    const supabaseAdmin = getSupabaseAdmin();

    // Validate referral code if provided
    if (sanitizedReferralCode) {
      const { data: referrerUser, error: referrerError } = await supabaseAdmin
        .from('users')
        .select('id, referral_code, verified')
        .eq('referral_code', sanitizedReferralCode)
        .eq('verified', true) // Only verified users can refer
        .single();

      if (referrerError || !referrerUser) {
        // Return specific error for invalid referral code
        return NextResponse.json({
          success: false,
          error: 'Invalid referral code. Please check and try again.',
          code: 'INVALID_REFERRAL_CODE'
        }, { status: 400 });
      }
    }

    // Check if user already exists in users table
    const { data: existingUser, error: userCheckError } = await supabaseAdmin
      .from('users')
      .select('id, name, phone, verified')
      .eq('phone', normalizedPhone)
      .single();

    if (existingUser && !userCheckError) {
      // User already exists
      if (existingUser.verified) {
        return createSecureErrorResponse('ACCOUNT_EXISTS', 409, {
          operation: 'generate-code',
          ip: request.headers.get('x-forwarded-for') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
          timestamp: new Date().toISOString()
        });
      } else {
        return createSecureErrorResponse('ACCOUNT_EXISTS', 409, {
          operation: 'generate-code',
          ip: request.headers.get('x-forwarded-for') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
          timestamp: new Date().toISOString()
        });
      }
    }

    // Generate unique code
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

    // Insert into database
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    
    const { data, error } = await supabaseAdmin
      .from('verification_codes')
      .insert({
        code,
        name: sanitizedName,
        whatsapp_number: normalizedPhone,
        verified: false,
        expires_at: expiresAt.toISOString(),
        referred_by_code: sanitizedReferralCode, // Store referral code if provided
      })
      .select()
      .single();

    if (error) {
      return handleDatabaseError(error, 'generate-code', {
        operation: 'generate-code',
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        timestamp: new Date().toISOString()
      });
    }

    // DO NOT generate JWT here - JWT only issued after password is set!
    // Set temporary HTTP-only cookie with phone number to track verification progress
    const response = NextResponse.json({ 
      success: true, 
      code: data.code 
    });

    // Set temporary cookie for verification flow (expires in 15 minutes)
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
      operation: 'generate-code',
      ip: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      timestamp: new Date().toISOString(),
      originalError: error
    });
  }
}

