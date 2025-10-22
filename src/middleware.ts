import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyAccessTokenMiddleware } from '@/lib/auth/jwt-middleware';
import { applySecurityHeaders } from '@/lib/security/security-headers';

// This runs on the edge (faster, cheaper than serverless)
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Define protected routes that require authentication
  const protectedRoutes = [
    '/dashboard',
    // Note: /verify and /set-password are NOT protected - they use verification_phone cookie
  ];

  // Get admin path from environment or use default
  const adminPath = process.env.NEXT_PUBLIC_ADMIN_PATH || process.env.ADMIN_PATH || '/admin';
  
  // Block access to admin pages via wrong paths (e.g., /login/login when adminPath is /muthalali)
  // Extract the first segment to check if someone is trying to access admin via a different path
  const pathSegments = pathname.split('/').filter(Boolean);
  const firstSegment = pathSegments[0] ? `/${pathSegments[0]}` : '';
  const secondSegment = pathSegments[1];
  
  // List of admin-specific pages (that exist under [adminPath])
  const adminPageNames = ['login', 'signin', 'dashboard', 'users', 'admin-users'];
  
  // If someone accesses /<something>/<admin-page> where <something> is NOT the configured adminPath
  if (firstSegment !== adminPath && secondSegment && adminPageNames.includes(secondSegment)) {
    // This is an unauthorized admin path access attempt - redirect to home
    const url = request.nextUrl.clone();
    url.pathname = '/';
    return NextResponse.redirect(url);
  }
  
  // List of paths that should NOT be treated as admin routes
  const publicAdminPaths = [
    `${adminPath}/login`,
    `${adminPath}/signin`,
  ];

  // Check if current path requires authentication
  const isProtectedRoute = protectedRoutes.some(route => 
    pathname.startsWith(route)
  );

  // Check if current path is an admin route (dynamic admin path)
  // Must start with adminPath but NOT be a public admin path
  const isPublicAdminPath = publicAdminPaths.some(path => pathname.startsWith(path));
  const isAdminApiAuth = pathname.startsWith('/api/admin/auth/');
  const isAdminRoute = pathname.startsWith(adminPath) && !isPublicAdminPath && !isAdminApiAuth;

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
    '/dashboard/:path*',
    '/set-password',
    '/verify',
    '/((?!api|_next/static|_next/image|favicon.ico).*)', // Match all routes except API and static files
  ],
};



