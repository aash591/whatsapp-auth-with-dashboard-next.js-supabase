import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/database/supabaseAdmin';
import { generateAccessToken } from '@/lib/auth/jwt';
import { hashPassword, validatePassword } from '@/lib/auth/auth-utils';
import { validateDoubleSubmitCSRF } from '@/lib/security/csrf';
import { applyAPISecurityHeaders } from '@/lib/security/security-headers';
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
        operation: 'set-password',
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        timestamp: new Date().toISOString()
      });
    }

    const body = await request.json();
    const { password, code } = body as { password: string; code: string };

    // Sanitize user input
    const sanitizedPassword = sanitizeUserInput(password);
    const sanitizedCode = sanitizeUserInput(code);

    // Validate password strength
    try {
      validatePassword(sanitizedPassword);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Invalid password';
      return handleValidationError([message], {
        operation: 'set-password',
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        timestamp: new Date().toISOString(),
        originalError: error
      });
    }

    // Validate verification code format
    if (!sanitizedCode || sanitizedCode.length !== 6) {
      return handleValidationError(['Invalid verification code format'], {
        operation: 'set-password',
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        timestamp: new Date().toISOString()
      });
    }

    // Look up verification code in database
    const supabaseAdmin = getSupabaseAdmin();
    const { data: verificationData, error: verificationError } = await supabaseAdmin
      .from('verification_codes')
      .select('*')
      .eq('code', sanitizedCode.toUpperCase())
      .single();

    if (verificationError || !verificationData) {
      return createSecureErrorResponse('INVALID_INPUT', 400, {
        operation: 'set-password',
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        timestamp: new Date().toISOString()
      });
    }

    // SECURITY: Verify the code belongs to the phone number in the verification session
    const verificationPhone = request.cookies.get('verification_phone')?.value;
    
    if (!verificationPhone) {
      return createSecureErrorResponse('SESSION_REQUIRED', 401, {
        operation: 'set-password',
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        timestamp: new Date().toISOString()
      });
    }

    if (verificationData.whatsapp_number !== verificationPhone) {
      return createSecureErrorResponse('FORBIDDEN', 403, {
        operation: 'set-password',
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        timestamp: new Date().toISOString()
      });
    }

    // Check if code has been verified via WhatsApp
    if (!verificationData.verified) {
      return createSecureErrorResponse('INVALID_INPUT', 400, {
        operation: 'set-password',
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        timestamp: new Date().toISOString()
      });
    }

    // Check if code has expired
    if (new Date(verificationData.expires_at) < new Date()) {
      return createSecureErrorResponse('AUTH_EXPIRED', 400, {
        operation: 'set-password',
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        timestamp: new Date().toISOString()
      });
    }

    // Check if user already exists (password reset vs new signup)
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id, name, phone, referral_code')
      .eq('phone', verificationData.whatsapp_number)
      .single();

    // Hash the password
    const passwordHash = await hashPassword(sanitizedPassword);
    const now = new Date().toISOString();

    let userData;

    if (existingUser) {
      // PASSWORD RESET: Update existing user's password
      const { data: updatedUser, error: updateError } = await supabaseAdmin
        .from('users')
        .update({
          password_hash: passwordHash,
          verified: true,
          verified_at: now,
          updated_at: now,
        })
        .eq('id', existingUser.id)
        .select()
        .single();

      if (updateError || !updatedUser) {
        return handleDatabaseError(updateError, 'set-password', {
          operation: 'set-password',
          ip: request.headers.get('x-forwarded-for') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
          timestamp: new Date().toISOString()
        });
      }

      userData = updatedUser;
    } else {
      // NEW SIGNUP: Create new user
      // Look up referrer if referred_by_code exists
      let referrerId = null;
      if (verificationData.referred_by_code) {
        const { data: referrer } = await supabaseAdmin
          .from('users')
          .select('id')
          .eq('referral_code', verificationData.referred_by_code)
          .single();
        
        if (referrer) {
          referrerId = referrer.id;
        }
      }

      const { data: newUser, error: createError } = await supabaseAdmin
        .from('users')
        .insert({
          name: verificationData.name,
          phone: verificationData.whatsapp_number,
          password_hash: passwordHash,
          verified: true,
          verified_at: now,
          referral_code: verificationData.code, // Use verification code as user's referral code
          referred_by_user_id: referrerId, // Link to referrer if exists
          referred_by_code: verificationData.referred_by_code, // ✅ Store which code was used
          referred_at: referrerId ? now : null, // Set referral timestamp if they were referred
          referral_points: 0,
          available_points: 0,
          total_referrals_count: 0, // ✅ Initialize cached count
        })
        .select()
        .single();

      if (createError || !newUser) {
        return handleDatabaseError(createError, 'set-password', {
          operation: 'set-password',
          ip: request.headers.get('x-forwarded-for') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
          timestamp: new Date().toISOString()
        });
      }

      userData = newUser;

      // NOTE: Referral points are NOT awarded here for security and separation of concerns
      // A separate referral processing system will handle point awards based on business rules
      // This keeps authentication logic clean and prevents potential abuse
    }

    // Generate JWT token (works for both new signup and password reset)
    const token = generateAccessToken({
      userId: userData.id,
      username: userData.name,
      phone: userData.phone,
      role: 'user',
      sessionId: crypto.randomUUID(), // Generate unique session ID
    });

    // Set HTTP-only cookie
    const response = NextResponse.json(
      { 
        success: true, 
        message: 'Password set successfully',
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
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24, // 24 hours
      path: '/',
    });

    // SECURITY: Clear verification_phone cookie to prevent reuse
    response.cookies.set('verification_phone', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 0, // Expire immediately
      path: '/',
    });

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
