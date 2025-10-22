/**
 * API Route: Get Referral Statistics
 * GET /api/referral/stats
 * Requires authentication
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUserReferralStats, getReferredUsers } from '@/lib/referral';
import { verifyAccessTokenSecure as verifyJWT } from '@/lib/auth/jwt-middleware';
import { withSecurity } from '@/lib/security/api-middleware';

async function handler(request: NextRequest) {
  try {
    // Get JWT from cookie
    const token = request.cookies.get('auth-token')?.value;
    
    if (!token) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 });
    }

    // Verify JWT
    const decoded = await verifyJWT(token);
    
    if (!decoded || !decoded.userId) {
      return NextResponse.json({
        success: false,
        error: 'Invalid token'
      }, { status: 401 });
    }

    // Get referral stats
    const stats = await getUserReferralStats(decoded.userId);
    
    if (!stats) {
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch referral stats'
      }, { status: 500 });
    }

    // Get referred users list
    const referredUsers = await getReferredUsers(decoded.userId);

    return NextResponse.json({
      success: true,
      data: {
        stats,
        referredUsers
      }
    });
  } catch (err) {
    console.error('Error fetching referral stats:', err);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}

export const GET = withSecurity(handler, {
  requireCSRF: false, // GET request
  rateLimit: {
    maxRequests: 20,
    windowMs: 60 * 1000 // 20 requests per minute
  }
});

