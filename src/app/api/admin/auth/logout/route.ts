import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/database/supabaseAdmin';
import { decodeAdminToken } from '@/lib/auth';
import { applyAPISecurityHeaders } from '@/lib/security/security-headers';
import { 
  createGenericErrorResponse
} from '@/lib/security/error-handling';

export async function POST(request: NextRequest) {
  try {
    // Get admin token from cookies
    const adminToken = request.cookies.get('admin_token')?.value;

    if (adminToken) {
      // Decode the JWT token to get session token
      const tokenData = decodeAdminToken(adminToken);
      
      if (tokenData && tokenData.code) {
        // Delete session from database
        const supabaseAdmin = getSupabaseAdmin();
        await supabaseAdmin
          .from('admin_sessions')
          .delete()
          .eq('session_token', tokenData.code);
      }
    }

    const response = NextResponse.json({
      success: true,
      message: 'Admin logout successful'
    });

    // Clear admin token cookie
    response.headers.set(
      'Set-Cookie',
      'admin_token=; HttpOnly; Secure; Path=/; Max-Age=0; SameSite=Strict'
    );

    return applyAPISecurityHeaders(response);

  } catch (error) {
    return createGenericErrorResponse({
      operation: 'admin-logout',
      ip: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      timestamp: new Date().toISOString(),
      originalError: error
    });
  }
}

