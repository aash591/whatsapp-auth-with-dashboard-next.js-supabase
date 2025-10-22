import { NextResponse } from 'next/server';
import { generateCSRFToken, setCSRFCookie } from '@/lib/security/csrf';

/**
 * GET /api/auth/csrf-token
 * Generate and return a CSRF token for form submissions
 * Token is both set in HTTP-only cookie and returned in response body
 */
export async function GET() {
  try {
    // Generate new CSRF token
    const csrfToken = generateCSRFToken();
    
    // Create response with token
    const response = NextResponse.json({
      success: true,
      csrfToken
    });
    
    // Set CSRF token in HTTP-only cookie
    setCSRFCookie(response, csrfToken);
    
    return response;
  } catch (error) {
    console.error('Error generating CSRF token:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to generate CSRF token' 
      },
      { status: 500 }
    );
  }
}

