import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/database/supabaseAdmin';
import { verifyAccessToken } from '@/lib/auth/jwt';
import {
  createSecureErrorResponse,
  handleDatabaseError,
  createGenericErrorResponse
} from '@/lib/security/error-handling';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth_token')?.value;
    
    if (!token) {
      return createSecureErrorResponse('AUTH_REQUIRED', 401, {
        operation: 'session',
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        timestamp: new Date().toISOString()
      });
    }

    const sessionData = verifyAccessToken(token);
    
    if (!sessionData) {
      return createSecureErrorResponse('AUTH_INVALID', 401, {
        operation: 'session',
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        timestamp: new Date().toISOString()
      });
    }

    // Get user data from database using userId from JWT
    const supabaseAdmin = getSupabaseAdmin();
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, name, phone, referral_code, referral_points, available_points, total_referrals_count, referred_by_code, verified, verified_at, referred_at, is_fraudulent, created_at')
      .eq('id', sessionData.userId)
      .single();

    if (userError || !userData) {
      return handleDatabaseError(userError, 'session', {
        operation: 'session',
        userId: sessionData.userId,
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        timestamp: new Date().toISOString()
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: userData.id,
        name: userData.name,
        phone: userData.phone,
        whatsapp_number: userData.phone,
        referral_code: userData.referral_code,
        referral_points: userData.referral_points || 0,
        available_points: userData.available_points || 0,
        total_referrals: userData.total_referrals_count || 0, // ✅ Optimized: Cached count
        referred_by_code: userData.referred_by_code || null, // ✅ Track which code was used
        verified: userData.verified,
        verified_at: userData.verified_at,
        referred_at: userData.referred_at,
        is_fraudulent: userData.is_fraudulent || false,
        created_at: userData.created_at,
      },
    });
  } catch (error) {
    return createGenericErrorResponse({
      operation: 'session',
      ip: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      timestamp: new Date().toISOString(),
      originalError: error
    });
  }
}
