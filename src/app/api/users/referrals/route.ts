import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/database/supabaseAdmin';
import { verifyAccessToken } from '@/lib/auth/jwt';
import {
  createSecureErrorResponse,
  handleDatabaseError,
} from '@/lib/security/error-handling';

// GET user's referrals list
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const token = request.cookies.get('auth_token')?.value;
    
    if (!token) {
      return createSecureErrorResponse('AUTH_REQUIRED', 401, {
        operation: 'get-user-referrals',
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        timestamp: new Date().toISOString()
      });
    }

    const sessionData = verifyAccessToken(token);
    
    if (!sessionData || !sessionData.userId) {
      return createSecureErrorResponse('AUTH_INVALID', 401, {
        operation: 'get-user-referrals',
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        timestamp: new Date().toISOString()
      });
    }

    // Get user's referral code first
    const supabaseAdmin = getSupabaseAdmin();
    const { data: currentUser, error: currentUserError } = await supabaseAdmin
      .from('users')
      .select('referral_code')
      .eq('id', sessionData.userId)
      .single();

    if (currentUserError || !currentUser?.referral_code) {
      return handleDatabaseError(currentUserError, 'get-user-referrals', {
        operation: 'get-current-user',
        userId: sessionData.userId,
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        timestamp: new Date().toISOString()
      });
    }

    // Get all users referred by this user
    const { data: referrals, error: referralsError } = await supabaseAdmin
      .from('users')
      .select('id, name, phone, verified_at, created_at')
      .eq('referred_by_code', currentUser.referral_code)
      .order('created_at', { ascending: false });

    if (referralsError) {
      return handleDatabaseError(referralsError, 'get-user-referrals', {
        operation: 'get-referrals',
        userId: sessionData.userId,
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        timestamp: new Date().toISOString()
      });
    }

    // Format referrals data
    const formattedReferrals = (referrals || []).map(referral => ({
      id: referral.id,
      name: referral.name,
      phone: referral.phone,
      verified: !!referral.verified_at,
      joinedAt: referral.created_at,
      verifiedAt: referral.verified_at,
    }));

    return NextResponse.json({
      success: true,
      data: {
        referrals: formattedReferrals,
        total: formattedReferrals.length,
        verified: formattedReferrals.filter(r => r.verified).length,
        pending: formattedReferrals.filter(r => !r.verified).length,
      },
    });
  } catch (error) {
    console.error('Error fetching referrals:', error);
    return createSecureErrorResponse('INTERNAL_ERROR', 500, {
      operation: 'get-user-referrals',
      ip: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      timestamp: new Date().toISOString()
    });
  }
}

