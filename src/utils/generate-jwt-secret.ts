/**
 * Utility to generate cryptographically secure JWT secrets
 * Run this script to generate a secure JWT_SECRET for production
 */

import crypto from 'crypto';

/**
 * Generate a cryptographically secure JWT secret
 * @param length - Length of the secret (default: 64 characters)
 * @returns Base64 encoded secret
 */
export function generateSecureJWTSecret(length: number = 64): string {
  return crypto.randomBytes(length).toString('base64');
}

/**
 * Generate a secure JWT secret and display it
 */
export function displayJWTSecret(): void {
  const secret = generateSecureJWTSecret(64);
  
  console.log('\n🔐 Generated Secure JWT Secret:');
  console.log('================================');
  console.log(secret);
  console.log('================================');
  console.log('\n📋 Add this to your environment variables:');
  console.log(`JWT_SECRET="${secret}"`);
  console.log('\n⚠️  Keep this secret secure and never commit it to version control!');
  console.log('📝 Add JWT_SECRET to your .env.local file for development');
  console.log('🚀 Add JWT_SECRET to your production environment variables');
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  displayJWTSecret();
}
