import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/database/supabaseAdmin';
import { decodeAdminToken } from '@/lib/auth';
import { 
  createSecureErrorResponse, 
  handleDatabaseError,
  createGenericErrorResponse
} from '@/lib/security/error-handling';
import { applyAPISecurityHeaders } from '@/lib/security/security-headers';

// GET - Fetch all regular users (customers)
export async function GET(request: NextRequest) {
  try {
    // Get admin token from cookies
    const adminToken = request.cookies.get('admin_token')?.value;

    if (!adminToken) {
      return createSecureErrorResponse('AUTH_REQUIRED', 401, {
        operation: 'regular-users-list',
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        timestamp: new Date().toISOString()
      });
    }

    // Decode the JWT token
    const tokenData = decodeAdminToken(adminToken);
    
    if (!tokenData || !tokenData.adminId) {
      return createSecureErrorResponse('AUTH_INVALID', 401, {
        operation: 'regular-users-list',
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        timestamp: new Date().toISOString()
      });
    }

    const supabaseAdmin = getSupabaseAdmin();

    // Verify admin exists
    const { data: currentAdmin, error: adminError } = await supabaseAdmin
      .from('admin_users')
      .select('id, role')
      .eq('id', tokenData.adminId)
      .single();

    if (adminError || !currentAdmin) {
      return createSecureErrorResponse('AUTH_INVALID', 401, {
        operation: 'regular-users-list',
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        timestamp: new Date().toISOString()
      });
    }

    // Fetch all regular users from users table
    const { data: users, error: usersError } = await supabaseAdmin
      .from('users')
      .select('id, phone, name, verified, created_at, updated_at, referral_code, referral_points, available_points')
      .order('created_at', { ascending: false });

    if (usersError) {
      return handleDatabaseError(usersError, 'regular-users-list', {
        operation: 'regular-users-list',
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        timestamp: new Date().toISOString()
      });
    }

    const response = NextResponse.json({
      success: true,
      data: users || []
    });

    return applyAPISecurityHeaders(response);
  } catch (error) {
    return createGenericErrorResponse({
      operation: 'regular-users-list',
      ip: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      timestamp: new Date().toISOString(),
      originalError: error
    });
  }
}



