/**
 * CSRF Token API Endpoint
 * Provides CSRF tokens for client-side requests
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateCSRFToken, setCSRFCookie } from '@/lib/csrf-double-submit';
import { 
  createSecureErrorResponse, 
  createGenericErrorResponse
} from '@/lib/secure-error-handling-enhanced';
const crypto = require('crypto');

export async function GET(request: NextRequest) {
  try {
    // Add basic rate limiting check (simple implementation)
    const userAgent = request.headers.get('user-agent');
    if (!userAgent) {
      return createSecureErrorResponse('INVALID_INPUT', 400, {
        operation: 'csrf-token',
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: 'unknown',
        timestamp: new Date().toISOString()
      });
    }

    // Check if we already have a CSRF token in the cookie
    const existingToken = request.cookies.get('csrf-token')?.value;
    
    let token: string;
    if (existingToken) {
      // Use existing token
      token = existingToken;
    } else {
      // Generate new token only if none exists
      token = generateCSRFToken();
    }

    if (!token) {
      return createSecureErrorResponse('INTERNAL_ERROR', 500, {
        operation: 'csrf-token',
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        timestamp: new Date().toISOString()
      });
    }

    const response = NextResponse.json({
      success: true,
      token,
      expiresIn: 15 * 60, // 15 minutes in seconds
      message: existingToken ? 'CSRF token retrieved successfully' : 'CSRF token generated successfully'
    });

    // Only set cookie if we generated a new token
    if (!existingToken) {
      setCSRFCookie(response, token);
    }

    return response;

  } catch (error) {
    return createGenericErrorResponse({
      operation: 'csrf-token',
      ip: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      timestamp: new Date().toISOString(),
      originalError: error
    });
  }
}
