import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/database/supabaseAdmin';
import { comparePassword } from '@/lib/auth/auth-utils';
import { generateSecureAdminToken } from '@/utils/secureAuth';
import { validateDoubleSubmitCSRF } from '@/lib/security/csrf';
import crypto from 'crypto';
import { 
  createSecureErrorResponse, 
  handleDatabaseError, 
  handleValidationError,
  handleCSRFError,
  createGenericErrorResponse,
  sanitizeUserInput
} from '@/lib/security/error-handling';
import { applyAPISecurityHeaders } from '@/lib/security/security-headers';

export async function POST(request: NextRequest) {
  try {
    // CRITICAL: CSRF protection for authentication operation
    const csrfValid = validateDoubleSubmitCSRF(request);
    if (!csrfValid) {
      return handleCSRFError({
        operation: 'admin-login',
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        timestamp: new Date().toISOString()
      });
    }

    const body = await request.json();
    const { username, password } = body as { username: string; password: string };

    // Sanitize user input
    const sanitizedUsername = sanitizeUserInput(username);
    const sanitizedPassword = sanitizeUserInput(password);

    if (!sanitizedUsername || !sanitizedPassword) {
      return handleValidationError(['Username and password are required'], {
        operation: 'admin-login',
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        timestamp: new Date().toISOString()
      });
    }

    // Find admin user by username
    const supabaseAdmin = getSupabaseAdmin();
    const { data: admin, error: adminError } = await supabaseAdmin
      .from('admin_users')
      .select('id, name, username, password_hash, email, role, is_active')
      .eq('username', sanitizedUsername)
      .eq('is_active', true)
      .single();

    if (adminError || !admin) {
      return createSecureErrorResponse('AUTH_INVALID', 401, {
        operation: 'admin-login',
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        timestamp: new Date().toISOString()
      });
    }

    // Verify password using bcrypt
    const isPasswordValid = await comparePassword(sanitizedPassword, admin.password_hash);
    
    if (!isPasswordValid) {
      return createSecureErrorResponse('AUTH_INVALID', 401, {
        operation: 'admin-login',
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        timestamp: new Date().toISOString()
      });
    }

    // Generate secure session token
    const sessionToken = crypto.randomBytes(64).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Store session in database
    const { error: sessionError } = await supabaseAdmin
      .from('admin_sessions')
      .insert({
        admin_user_id: admin.id,
        session_token: sessionToken,
        expires_at: expiresAt.toISOString(),
        ip_address: request.headers.get('x-forwarded-for') || 'unknown',
        user_agent: request.headers.get('user-agent') || 'unknown'
      });

    if (sessionError) {
      return handleDatabaseError(sessionError, 'admin-login', {
        operation: 'admin-login',
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        timestamp: new Date().toISOString()
      });
    }

    // Update last login
    await supabaseAdmin
      .from('admin_users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', admin.id);

    // Generate JWT token for the admin
    const secureToken = generateSecureAdminToken({
      code: sessionToken,
      name: admin.name,
      username: admin.username,
      role: admin.role,
      adminId: admin.id
    });

    const response = NextResponse.json({
      success: true,
      message: 'Admin login successful',
      admin: {
        id: admin.id,
        name: admin.name,
        username: admin.username,
        email: admin.email,
        role: admin.role
      }
    });

    // Set secure cookie with admin session
    response.headers.set(
      'Set-Cookie',
      `admin_token=${secureToken}; HttpOnly; Secure; Path=/; Max-Age=${24 * 60 * 60}; SameSite=Strict`
    );

    return applyAPISecurityHeaders(response);

  } catch (error) {
    return createGenericErrorResponse({
      operation: 'admin-login',
      ip: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      timestamp: new Date().toISOString(),
      originalError: error
    });
  }
}

