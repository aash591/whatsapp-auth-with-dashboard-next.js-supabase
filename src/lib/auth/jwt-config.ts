/**
 * JWT Configuration with proper security settings
 */

export interface JWTPayload {
  userId: string;
  username: string;
  phone: string;
  role: string;
  iat?: number;
  exp?: number;
}

export interface JWTConfig {
  secret: string;
  expiresIn: string;
  refreshExpiresIn: string;
}

export function getJWTConfig(): JWTConfig {
  // CRITICAL: Never use default secrets in production
  const secret = process.env.JWT_SECRET;
  
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is required');
  }

  // Validate secret strength
  if (secret.length < 64) {
    throw new Error('JWT_SECRET must be at least 64 characters long for security');
  }

  // Validate secret contains sufficient entropy
  const entropy = calculateEntropy(secret);
  if (entropy < 4.0) {
    throw new Error('JWT_SECRET must contain sufficient entropy (mix of letters, numbers, symbols)');
  }

  const config = {
    secret: secret,
    expiresIn: process.env.JWT_EXPIRES_IN || '1h', // Reduced from 24h for security
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  };

  return config;
}

/**
 * Calculate entropy of a string
 */
function calculateEntropy(str: string): number {
  const freq: { [key: string]: number } = {};
  for (const char of str) {
    freq[char] = (freq[char] || 0) + 1;
  }
  
  let entropy = 0;
  const len = str.length;
  for (const count of Object.values(freq)) {
    const p = count / len;
    entropy -= p * Math.log2(p);
  }
  
  return entropy;
}
