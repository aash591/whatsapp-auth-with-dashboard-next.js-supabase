import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyAccessTokenMiddleware } from '@/lib/jwt-middleware-secure';
import { applySecurityHeaders } from '@/lib/security-headers';

// This runs on the edge (faster, cheaper than serverless)
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Define protected routes that require authentication
  const protectedRoutes = [
    '/protected',
    '/set-password',
    '/verification-status'
  ];

  // Get admin path from environment or use default
  const adminPath = process.env.NEXT_PUBLIC_ADMIN_PATH || process.env.ADMIN_PATH || '/admin';
  
  // Define admin routes that require admin authentication
  const adminRoutes = [
    `${adminPath}/dashboard`,
    `${adminPath}/users`,
    `${adminPath}/settings`
  ];

  // Check if current path requires authentication
  const isProtectedRoute = protectedRoutes.some(route => 
    pathname.startsWith(route)
  );

  // Check if current path is an admin route (dynamic admin path)
  const isAdminRoute = pathname.startsWith(adminPath) && 
    !pathname.startsWith(`${adminPath}/login`) &&
    !pathname.startsWith('/api/admin/auth/');

  // Handle admin routes
  if (isAdminRoute) {
    const adminToken = request.cookies.get('admin_token')?.value;

    if (!adminToken) {
      // No admin token, redirect to admin login
      const url = request.nextUrl.clone();
      url.pathname = `${adminPath}/login`;
      return NextResponse.redirect(url);
    }

    // CRITICAL: Validate admin JWT token with Edge-compatible verification
    try {
      const payload = await verifyAccessTokenMiddleware(adminToken);
      
      if (!payload) {
        // Invalid admin token, redirect to admin login
        const url = request.nextUrl.clone();
        url.pathname = `${adminPath}/login`;
        return NextResponse.redirect(url);
      }

      // Admin token is valid, allow the request to proceed with security headers
      const response = NextResponse.next();
      return applySecurityHeaders(response);
    } catch (error) {
      // Admin token verification failed, redirect to admin login
      console.error('Admin JWT verification failed in middleware:', error);
      const url = request.nextUrl.clone();
      url.pathname = `${adminPath}/login`;
      return NextResponse.redirect(url);
    }
  }

  // Handle regular protected routes
  if (isProtectedRoute) {
    const token = request.cookies.get('auth_token')?.value;

    if (!token) {
      // No token, redirect to home
      const url = request.nextUrl.clone();
      url.pathname = '/';
      return NextResponse.redirect(url);
    }

    // CRITICAL: Validate JWT token with Edge-compatible verification
    try {
      const payload = await verifyAccessTokenMiddleware(token);
      
      if (!payload) {
        // Invalid token, redirect to home
        const url = request.nextUrl.clone();
        url.pathname = '/';
        return NextResponse.redirect(url);
      }

      // Token is valid, allow the request to proceed with security headers
      const response = NextResponse.next();
      return applySecurityHeaders(response);
    } catch (error) {
      // Token verification failed, redirect to home
      console.error('JWT verification failed in middleware:', error);
      const url = request.nextUrl.clone();
      url.pathname = '/';
      return NextResponse.redirect(url);
    }
  }

  // Allow all other requests with security headers
  const response = NextResponse.next();
  return applySecurityHeaders(response);
}

// Configure which paths trigger the middleware
export const config = {
  matcher: [
    '/protected/:path*',
    '/set-password',
    '/verification-status',
    '/((?!api|_next/static|_next/image|favicon.ico).*)', // Match all routes except API and static files
  ],
};



