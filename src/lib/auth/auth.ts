import { NextApiResponse } from 'next';
import { generateAccessToken, verifyAccessToken } from './jwt';

/**
 * Generate secure JWT token (replaces weak Base64 implementation)
 */
export function generateAuthToken(data: {
  code: string;
  name: string;
  whatsappNumber: string;
  verified: boolean;
}): string {
  return generateAccessToken({
    userId: data.code,
    username: data.name,
    phone: data.whatsappNumber,
    role: 'user'
  });
}

/**
 * Verify secure JWT token (replaces weak Base64 decoding)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function decodeAuthToken(token: string): any {
  try {
    const payload = verifyAccessToken(token);
    
    if (!payload) {
      return null;
    }

    // Convert JWT payload back to legacy format for compatibility
    return {
      code: payload.userId,
      name: payload.username,
      whatsappNumber: payload.phone,
      verified: true,
      timestamp: (payload.iat || 0) * 1000, // Convert to milliseconds
      expiresAt: (payload.exp || 0) * 1000  // Convert to milliseconds
    };
  } catch {
    return null;
  }
}

/**
 * Decode admin JWT token
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function decodeAdminToken(token: string): any {
  try {
    const payload = verifyAccessToken(token);
    
    if (!payload) {
      return null;
    }

    // Convert JWT payload for admin format
    return {
      adminId: payload.phone, // adminId is stored in phone field
      name: payload.username,
      role: payload.role,
      code: payload.userId, // session token is stored in userId field
      timestamp: (payload.iat || 0) * 1000,
      expiresAt: (payload.exp || 0) * 1000
    };
  } catch {
    return null;
  }
}

export function setAuthCookie(res: NextApiResponse, token: string) {
  const cookie = `auth_token=${token}; HttpOnly; Secure; Path=/; Max-Age=${24 * 60 * 60}; SameSite=Strict`;
  
  res.setHeader('Set-Cookie', cookie);
}

export function clearAuthCookie(res: NextApiResponse) {
  const cookie = 'auth_token=; HttpOnly; Secure; Path=/; Max-Age=0; SameSite=Strict';
  
  res.setHeader('Set-Cookie', cookie);
}
