import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/database/supabaseAdmin';
import { decodeAdminToken } from '@/lib/auth';
import { applyAPISecurityHeaders } from '@/lib/security/security-headers';
import { 
  createSecureErrorResponse, 
  createGenericErrorResponse
} from '@/lib/security/error-handling';

export async function GET(request: NextRequest) {
  try {
    // Get admin token from cookies
    const adminToken = request.cookies.get('admin_token')?.value;

    if (!adminToken) {
      return createSecureErrorResponse('AUTH_REQUIRED', 401, {
        operation: 'admin-me',
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        timestamp: new Date().toISOString()
      });
    }

    // Decode the JWT token
    const tokenData = decodeAdminToken(adminToken);
    
    if (!tokenData || !tokenData.adminId) {
      return createSecureErrorResponse('AUTH_INVALID', 401, {
        operation: 'admin-me',
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        timestamp: new Date().toISOString()
      });
    }

    // Verify session exists and is valid
    const supabaseAdmin = getSupabaseAdmin();
    
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('admin_sessions')
      .select(`
        id,
        expires_at,
        admin_users!inner(
          id,
          name,
          username,
          email,
          role,
          is_active,
          last_login
        )
      `)
      .eq('session_token', tokenData.code)
      .gte('expires_at', new Date().toISOString())
      .single();

    if (sessionError || !session || !session.admin_users) {
      return createSecureErrorResponse('AUTH_EXPIRED', 401, {
        operation: 'admin-me',
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        timestamp: new Date().toISOString()
      });
    }

    // Check if admin is still active
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (!(session.admin_users as any).is_active) {
      return createSecureErrorResponse('UNAUTHORIZED', 401, {
        operation: 'admin-me',
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        timestamp: new Date().toISOString()
      });
    }

    const response = NextResponse.json({
      success: true,
      data: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        id: (session.admin_users as any).id,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        name: (session.admin_users as any).name,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        username: (session.admin_users as any).username,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        email: (session.admin_users as any).email,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        role: (session.admin_users as any).role,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        lastLogin: (session.admin_users as any).last_login
      }
    });

    return applyAPISecurityHeaders(response);

  } catch (error) {
    return createGenericErrorResponse({
      operation: 'admin-me',
      ip: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      timestamp: new Date().toISOString(),
      originalError: error
    });
  }
}

