/**
 * Edge-compatible JWT authentication utilities
 * Uses proper JWT with jsonwebtoken library
 */

import { generateAccessToken, verifyAccessToken } from '@/lib/jwt';

interface SessionData {
  code: string;
  name: string;
  whatsappNumber: string;
  verified: boolean;
}

/**
 * Generate secure JWT token (Edge-compatible)
 */
export async function generateSecureTokenEdge(data: SessionData): Promise<string> {
  return generateAccessToken({
    userId: data.code, // Use code as userId for compatibility
    username: data.name,
    phone: data.whatsappNumber, // Use proper phone field
    role: 'user'
  });
}

/**
 * Verify and decode secure JWT token (Edge-compatible)
 */
export async function verifySecureTokenEdge(token: string): Promise<SessionData | null> {
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

