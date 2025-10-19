import { NextRequest, NextResponse } from 'next/server';
import { validateDoubleSubmitCSRF } from '@/lib/csrf-double-submit';
import { applyAPISecurityHeaders } from '@/lib/security-headers';
import { 
  handleCSRFError,
  createGenericErrorResponse
} from '@/lib/secure-error-handling-enhanced';

// Run on Edge for better performance
export const runtime = 'edge';

export async function POST(request: NextRequest) {
  try {
    // CRITICAL: CSRF protection for state-changing operation
    const csrfValid = validateDoubleSubmitCSRF(request);
    if (!csrfValid) {
      return handleCSRFError({
        operation: 'logout',
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        timestamp: new Date().toISOString()
      });
    }

    const response = NextResponse.json({ success: true });
    
    response.headers.set(
      'Set-Cookie',
      `auth_token=; HttpOnly; Secure; Path=/; Max-Age=0; SameSite=Strict`
    );
    
    return applyAPISecurityHeaders(response);
  } catch (error) {
    return createGenericErrorResponse({
      operation: 'logout',
      ip: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      timestamp: new Date().toISOString(),
      originalError: error
    });
  }
}

