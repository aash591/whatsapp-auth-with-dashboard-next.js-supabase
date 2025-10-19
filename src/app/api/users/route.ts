import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { decodeAdminToken } from '@/lib/auth';
import {
  createSecureErrorResponse,
  handleDatabaseError,
  createGenericErrorResponse
} from '@/lib/secure-error-handling-enhanced';
import { applyAPISecurityHeaders } from '@/lib/security-headers';

export async function GET(request: NextRequest) {
  try {
    const adminToken = request.cookies.get('admin_token')?.value;

    if (!adminToken) {
      return createSecureErrorResponse('AUTH_REQUIRED', 401, {
        operation: 'users-list',
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        timestamp: new Date().toISOString()
      });
    }

    const tokenData = decodeAdminToken(adminToken);

    if (!tokenData || !tokenData.adminId) {
      return createSecureErrorResponse('AUTH_INVALID', 401, {
        operation: 'users-list',
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        timestamp: new Date().toISOString()
      });
    }

    const supabaseAdmin = getSupabaseAdmin();
    const { data: users, error: dbError } = await supabaseAdmin
      .from('users')
      .select('id, phone, name, verified, created_at, updated_at')
      .order('created_at', { ascending: false });

    if (dbError) {
      return handleDatabaseError(dbError, 'users-list', {
        operation: 'users-list',
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        timestamp: new Date().toISOString()
      });
    }

    const response = NextResponse.json({
      success: true,
      data: users
    });

    return applyAPISecurityHeaders(response);

  } catch (error) {
    return createGenericErrorResponse({
      operation: 'users-list',
      ip: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      timestamp: new Date().toISOString(),
      originalError: error
    });
  }
}
