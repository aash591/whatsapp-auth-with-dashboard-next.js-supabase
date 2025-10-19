/**
 * Secure JWT Verification for Middleware
 * Performs full cryptographic signature verification
 */

import { JWTPayload } from '@/lib/jwt-config';

/**
 * Verify JWT token with full signature verification (Edge-compatible)
 * @param token - JWT token to verify
 * @returns Decoded payload or null if invalid
 */
export function verifyAccessTokenSecure(token: string): JWTPayload | null {
  try {
    // Split JWT into parts
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const [headerB64, payloadB64, signatureB64] = parts;

    // Decode header to check algorithm
    const header = JSON.parse(atob(headerB64));
    if (header.alg !== 'HS256') {
      return null;
    }

    // Decode payload
    const payload = JSON.parse(atob(payloadB64));

    // Verify issuer and audience
    if (payload.iss !== 'whatsapp-auth-system' || payload.aud !== 'auth-app') {
      return null;
    }

    // Check expiration
    if (payload.exp && Date.now() >= payload.exp * 1000) {
      return null;
    }

    // CRITICAL: Verify signature using Web Crypto API (Edge-compatible)
    const isValid = verifyJWTSignature(token);
    if (!isValid) {
      return null;
    }

    return payload as JWTPayload;
  } catch (error) {
    console.error('Secure JWT verification error:', error);
    return null;
  }
}

/**
 * Verify JWT signature using Web Crypto API (Edge-compatible)
 * @param token - JWT token to verify
 * @returns True if signature is valid
 */
async function verifyJWTSignature(token: string): Promise<boolean> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return false;
    }

    const [headerB64, payloadB64, signatureB64] = parts;
    
    // Get JWT secret
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error('JWT_SECRET not configured');
      return false;
    }

    // Create HMAC key from secret
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    // Prepare data for verification
    const data = `${headerB64}.${payloadB64}`;
    const signature = Uint8Array.from(atob(signatureB64), c => c.charCodeAt(0));

    // Verify signature
    const isValid = await crypto.subtle.verify(
      'HMAC',
      cryptoKey,
      signature,
      encoder.encode(data)
    );

    return isValid;
  } catch (error) {
    console.error('JWT signature verification error:', error);
    return false;
  }
}

/**
 * Asynchronous JWT verification for middleware (with proper signature check)
 * Uses Web Crypto API for cryptographic verification (Edge Runtime compatible)
 */
export async function verifyAccessTokenMiddleware(token: string): Promise<JWTPayload | null> {
  try {
    // Split JWT into parts
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const [headerB64, payloadB64, signatureB64] = parts;

    // Helper function to decode base64url
    const base64urlDecode = (str: string): string => {
      // Convert base64url to base64
      const base64 = str
        .replace(/-/g, '+')
        .replace(/_/g, '/');
      
      // Add padding if needed
      const padded = base64 + '='.repeat((4 - base64.length % 4) % 4);
      
      return atob(padded);
    };

    // Decode header to check algorithm
    const header = JSON.parse(base64urlDecode(headerB64));
    if (header.alg !== 'HS256') {
      return null;
    }

    // Decode payload
    const payload = JSON.parse(base64urlDecode(payloadB64));

    // Verify issuer and audience
    if (payload.iss !== 'whatsapp-auth-system' || payload.aud !== 'auth-app') {
      return null;
    }

    // Check expiration
    if (payload.exp && Date.now() >= payload.exp * 1000) {
      return null;
    }

    // CRITICAL: Verify signature using proper cryptographic verification
    try {
      const isValid = await verifyJWTSignatureSync(token);
      if (!isValid) {
        console.warn('JWT signature verification failed, rejecting token');
        return null;
      }
    } catch (cryptoError) {
      console.error('Crypto verification failed, rejecting token for security:', cryptoError);
      // SECURITY: Fail securely - do not allow tokens without proper cryptographic verification
      return null;
    }

    return payload as JWTPayload;
  } catch (error) {
    console.error('Middleware JWT verification error:', error);
    return null;
  }
}

/**
 * Synchronous JWT signature verification for middleware
 * Uses Web Crypto API for proper cryptographic verification (Edge Runtime compatible)
 * @param token - JWT token to verify
 * @returns True if signature is valid
 */
async function verifyJWTSignatureSync(token: string): Promise<boolean> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return false;
    }

    const [headerB64, payloadB64, signatureB64] = parts;
    
    // Get JWT secret
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error('JWT_SECRET not configured');
      return false;
    }

    // Decode and validate payload first
    let payload;
    try {
      // Helper function to decode base64url
      const base64urlDecode = (str: string): string => {
        // Convert base64url to base64
        const base64 = str
          .replace(/-/g, '+')
          .replace(/_/g, '/');
        
        // Add padding if needed
        const padded = base64 + '='.repeat((4 - base64.length % 4) % 4);
        
        return atob(padded);
      };
      
      payload = JSON.parse(base64urlDecode(payloadB64));
      
      // Verify required fields exist
      if (!payload.iss || !payload.aud || !payload.exp) {
        return false;
      }
      
      // Verify issuer and audience
      if (payload.iss !== 'whatsapp-auth-system' || payload.aud !== 'auth-app') {
        return false;
      }
      
      // Check expiration
      if (payload.exp && Date.now() >= payload.exp * 1000) {
        return false;
      }
      
      // Additional security: Check that the token has a reasonable expiration time
      const now = Math.floor(Date.now() / 1000);
      const exp = payload.exp;
      if (exp < now || exp > now + (24 * 60 * 60)) { // Not more than 24 hours
        return false;
      }
    } catch (error) {
      return false;
    }

    // CRITICAL: Verify cryptographic signature using Web Crypto API
    try {
      // Create HMAC key from secret
      const encoder = new TextEncoder();
      const keyData = encoder.encode(secret);
      const cryptoKey = await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['verify']
      );

      // Prepare data for verification
      const data = `${headerB64}.${payloadB64}`;
      
      // Convert base64url to Uint8Array (JWT uses base64url encoding)
      const base64urlToUint8Array = (base64url: string): BufferSource => {
        // Convert base64url to base64
        const base64 = base64url
          .replace(/-/g, '+')
          .replace(/_/g, '/');
        
        // Add padding if needed
        const padded = base64 + '='.repeat((4 - base64.length % 4) % 4);
        
        // Convert to Uint8Array
        const binaryString = atob(padded);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes;
      };

      const signature = base64urlToUint8Array(signatureB64);

      // Verify signature
      const isValid = await crypto.subtle.verify(
        'HMAC',
        cryptoKey,
        signature,
        encoder.encode(data)
      );

      return isValid;
    } catch (error) {
      console.error('Crypto signature verification error:', error);
      console.error('Token parts:', { headerB64: headerB64.substring(0, 20) + '...', payloadB64: payloadB64.substring(0, 20) + '...', signatureB64: signatureB64.substring(0, 20) + '...' });
      return false;
    }
  } catch (error) {
    console.error('JWT signature verification error:', error);
    return false;
  }
}