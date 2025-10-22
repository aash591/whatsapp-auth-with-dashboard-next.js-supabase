import { NextApiRequest, NextApiResponse } from 'next';
import { generateAccessToken, verifyAccessToken } from '@/lib/auth/jwt';
// import { JWTPayload } from '@/lib/auth/jwt-config';

interface SessionData {
  code: string;
  name: string;
  whatsappNumber: string;
  verified: boolean;
}

interface AdminSessionData {
  code: string;
  name: string;
  username: string;
  role: string;
  adminId: string;
}

/**
 * Generate secure JWT token using proper cryptographic signing
 */
export function generateSecureToken(data: SessionData): string {
  return generateAccessToken({
    userId: data.code, // Use code as userId for compatibility
    username: data.name,
    phone: data.whatsappNumber, // Use proper phone field
    role: 'user'
  });
}

/**
 * Generate secure JWT token for admin users
 */
export function generateSecureAdminToken(data: AdminSessionData): string {
  return generateAccessToken({
    userId: data.code, // Use session token as userId for session lookup
    username: data.name,
    phone: data.adminId, // Store adminId in phone field for retrieval
    role: data.role
  });
}

/**
 * Verify and decode secure JWT token
 */
export function verifySecureToken(token: string): SessionData | null {
  try {
    const payload = verifyAccessToken(token);
    
    if (!payload) {
      return null;
    }

    // Convert JWT payload back to SessionData format
    return {
      code: payload.userId,
      name: payload.username,
      whatsappNumber: payload.phone,
      verified: true // JWT tokens are only issued to verified users
    };

  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}

/**
 * Generate cryptographically secure random token
 * Used for CSRF tokens, session IDs, etc.
 */
export async function generateSecureRandomToken(bytes: number = 32): Promise<string> {
  const crypto = await import('crypto');
  return crypto.randomBytes(bytes).toString('base64url');
}

/**
 * Set secure session cookie
 */
export function setSecureSessionCookie(res: NextApiResponse, token: string) {
  const cookie = `auth_token=${token}; HttpOnly; Secure; Path=/; Max-Age=${24 * 60 * 60}; SameSite=Strict`;
  
  res.setHeader('Set-Cookie', cookie);
}

/**
 * Clear session cookie
 */
export function clearSessionCookie(res: NextApiResponse) {
  const cookie = 'auth_token=; HttpOnly; Secure; Path=/; Max-Age=0; SameSite=Strict';
  
  res.setHeader('Set-Cookie', cookie);
}

/**
 * Extract token from request
 */
export function getTokenFromRequest(req: NextApiRequest): string | null {
  const cookieHeader = req.headers.cookie || '';
  const tokenMatch = cookieHeader.match(/auth_token=([^;]+)/);
  return tokenMatch ? tokenMatch[1] : null;
}

/**
 * Constant-time string comparison (prevents timing attacks)
 */
export async function secureCompare(a: string, b: string): Promise<boolean> {
  if (a.length !== b.length) {
    return false;
  }
  
  try {
    const nodeCrypto = await import('crypto');
    return nodeCrypto.timingSafeEqual(
      Buffer.from(a),
      Buffer.from(b)
    );
  } catch {
    return false;
  }
}
