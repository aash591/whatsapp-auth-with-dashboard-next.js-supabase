import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/database/supabaseAdmin';
import { verifyAccessToken } from '@/lib/auth/jwt';
import {
  createSecureErrorResponse,
  handleDatabaseError,
} from '@/lib/security/error-handling';

// GET user by referral code
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    // Verify authentication
    const token = request.cookies.get('auth_token')?.value;
    
    if (!token) {
      return createSecureErrorResponse('AUTH_REQUIRED', 401, {
        operation: 'get-user-by-code',
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        timestamp: new Date().toISOString()
      });
    }

    const sessionData = verifyAccessToken(token);
    
    if (!sessionData || !sessionData.userId) {
      return createSecureErrorResponse('AUTH_INVALID', 401, {
        operation: 'get-user-by-code',
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        timestamp: new Date().toISOString()
      });
    }

    // Await params for Next.js 15 compatibility
    const resolvedParams = await params;
    const { code } = resolvedParams;

    if (!code) {
      return createSecureErrorResponse('INVALID_INPUT', 400, {
        operation: 'get-user-by-code',
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        timestamp: new Date().toISOString()
      });
    }

    // Get user by referral code
    const supabaseAdmin = getSupabaseAdmin();
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, name, referral_code')
      .eq('referral_code', code.toUpperCase())
      .single();

    if (userError || !user) {
      return handleDatabaseError(userError, 'get-user-by-code', {
        operation: 'get-user-by-code',
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        timestamp: new Date().toISOString()
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: user.id,
        name: user.name,
        referral_code: user.referral_code,
      },
    });
  } catch (error) {
    console.error('Error fetching user by code:', error);
    return createSecureErrorResponse('INTERNAL_ERROR', 500, {
      operation: 'get-user-by-code',
      ip: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      timestamp: new Date().toISOString()
    });
  }
}

