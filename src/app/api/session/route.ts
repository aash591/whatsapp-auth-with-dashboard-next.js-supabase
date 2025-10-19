import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { verifySecureTokenEdge, generateSecureTokenEdge } from '@/utils/edgeAuth';
import { 
  createSecureErrorResponse, 
  handleDatabaseError, 
  createGenericErrorResponse
} from '@/lib/secure-error-handling-enhanced';

// Run on Node.js runtime to support crypto module for JWT
export const runtime = 'nodejs';

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

    const sessionData = await verifySecureTokenEdge(token);
    
    if (!sessionData) {
      return createSecureErrorResponse('AUTH_INVALID', 401, {
        operation: 'session',
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        timestamp: new Date().toISOString()
      });
    }

    // Check if this is a password-authenticated user (user ID as code) or verification-based
    const supabaseAdmin = getSupabaseAdmin();
    
    // Check if the code looks like a session ID (password authentication)
    if (sessionData.code && sessionData.code.length > 10) {
      // This is password authentication - JWT is self-contained and secure
      // No database query needed - JWT contains all necessary information
      return NextResponse.json({
        success: true,
        data: {
          code: sessionData.code, // Random session ID from JWT
          name: sessionData.name,
          verified: sessionData.verified,
        },
      });
    } else {
      // This is verification-based authentication - check verification_codes table
      const { data, error } = await supabaseAdmin
        .from('verification_codes')
        .select('verified, code, name')
        .eq('code', sessionData.code)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (error || !data) {
        return handleDatabaseError(error, 'session', {
          operation: 'session',
          userId: sessionData.code,
          ip: request.headers.get('x-forwarded-for') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
          timestamp: new Date().toISOString()
        });
      }

      const response = NextResponse.json({
        success: true,
        data: {
          code: data.code,
          name: data.name,
          verified: data.verified,
        },
      });

      // Update token if verification status changed
      if (data.verified !== sessionData.verified) {
        const newToken = await generateSecureTokenEdge({
          code: sessionData.code,
          name: sessionData.name,
          whatsappNumber: sessionData.whatsappNumber,
          verified: data.verified,
        });
        
        response.headers.set(
          'Set-Cookie',
          `auth_token=${newToken}; HttpOnly; Secure; Path=/; Max-Age=${24 * 60 * 60}; SameSite=Strict`
        );
      }

      return response;
    }
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

