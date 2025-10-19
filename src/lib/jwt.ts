/**
 * Secure JWT Implementation with Cryptographic Signing
 */

const jwt = require('jsonwebtoken');
import { getJWTConfig, JWTPayload } from './jwt-config';

const { secret: JWT_SECRET, expiresIn: JWT_EXPIRES_IN, refreshExpiresIn: JWT_REFRESH_EXPIRES_IN } = getJWTConfig();

/**
 * Generate access token with proper JWT signing
 * @param payload - Token payload (without iat/exp)
 * @returns Signed JWT token
 */
export function generateAccessToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
    issuer: 'whatsapp-auth-system',
    audience: 'auth-app'
  });
}

/**
 * Generate refresh token with longer expiration
 * @param payload - Token payload (without iat/exp)
 * @returns Signed JWT refresh token
 */
export function generateRefreshToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_REFRESH_EXPIRES_IN,
    issuer: 'whatsapp-auth-system',
    audience: 'auth-app'
  });
}

/**
 * Verify access token with proper validation
 * @param token - JWT token to verify
 * @returns Decoded payload or null if invalid
 */
export function verifyAccessToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'whatsapp-auth-system',
      audience: 'auth-app'
    }) as JWTPayload;
    
    return decoded;
  } catch (error) {
    console.error('JWT verification error:', error);
    return null;
  }
}

/**
 * Generate token pair (access + refresh)
 * @param payload - User data for token
 * @returns Object with access and refresh tokens
 */
export function generateTokenPair(payload: Omit<JWTPayload, 'iat' | 'exp'>): {
  accessToken: string;
  refreshToken: string;
} {
  return {
    accessToken: generateAccessToken(payload),
    refreshToken: generateRefreshToken(payload)
  };
}

/**
 * Check if token is expired
 * @param token - JWT token to check
 * @returns True if expired, false otherwise
 */
export function isTokenExpired(token: string): boolean {
  try {
    const decoded = jwt.decode(token) as JWTPayload;
    if (!decoded || !decoded.exp) return true;
    
    return Date.now() >= decoded.exp * 1000;
  } catch {
    return true;
  }
}
