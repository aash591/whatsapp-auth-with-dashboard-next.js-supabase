/**
 * Comprehensive webhook security middleware
 * Provides multiple layers of security for webhook endpoints
 */

import { NextRequest } from 'next/server';
import { getServerEnv } from './server-env';

export interface WebhookSecurityConfig {
  requireSignature: boolean;
  maxPayloadSize: number; // in bytes
  rateLimitWindow: number; // in milliseconds
  maxRequestsPerWindow: number;
}

export interface WebhookSecurityResult {
  isValid: boolean;
  error?: string;
  metadata: {
    timestamp: string;
    payloadSize: number;
    signatureValid: boolean;
  };
}

// Default security configuration
const DEFAULT_CONFIG: WebhookSecurityConfig = {
  requireSignature: true,
  maxPayloadSize: 1024 * 1024, // 1MB
  rateLimitWindow: 60 * 1000, // 1 minute
  maxRequestsPerWindow: 100
};

// In-memory rate limiting (for production, use Redis)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

/**
 * Comprehensive webhook security validation
 */
export function validateWebhookSecurity(
  request: NextRequest,
  config: Partial<WebhookSecurityConfig> = {}
): WebhookSecurityResult {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const timestamp = new Date().toISOString();
  
  // Get request details (only non-spoofable ones)
  const contentLength = parseInt(request.headers.get('content-length') || '0');
  
  const metadata = {
    timestamp,
    payloadSize: contentLength,
    signatureValid: false
  };

  // 1. Check payload size (basic DoS protection)
  if (contentLength > finalConfig.maxPayloadSize) {
    return {
      isValid: false,
      error: 'Request rejected - payload size limit exceeded',
      metadata
    };
  }

  // 2. Check for required signature header
  const signature = request.headers.get('x-hub-signature-256');
  if (!signature) {
    return {
      isValid: false,
      error: 'Request rejected - missing required authentication',
      metadata
    };
  }

  // 3. Mark signature as present (actual verification happens in main webhook handler)
  metadata.signatureValid = true;

  return {
    isValid: true,
    metadata
  };
}

/**
 * Clean up old rate limit entries
 */
export function cleanupRateLimit(): void {
  const now = Date.now();
  const keysToDelete: string[] = [];
  
  rateLimitMap.forEach((value, key) => {
    if (now > value.resetTime) {
      keysToDelete.push(key);
    }
  });
  
  keysToDelete.forEach(key => rateLimitMap.delete(key));
}

/**
 * Get rate limit status for an IP
 */
export function getRateLimitStatus(ip: string, windowMs: number = 60000): {
  remaining: number;
  resetTime: number;
  isLimited: boolean;
} {
  const rateLimitKey = `${ip}:${Math.floor(Date.now() / windowMs)}`;
  const current = rateLimitMap.get(rateLimitKey);
  
  if (!current) {
    return {
      remaining: 100, // Default limit
      resetTime: Date.now() + windowMs,
      isLimited: false
    };
  }

  return {
    remaining: Math.max(0, 100 - current.count),
    resetTime: current.resetTime,
    isLimited: current.count >= 100
  };
}

/**
 * Log security events for monitoring
 */
export function logSecurityEvent(
  event: 'webhook_accepted' | 'webhook_rejected' | 'rate_limit_exceeded' | 'invalid_signature',
  details: any
): void {
  // Only log security issues, not successful events
  if (event !== 'webhook_accepted') {
    const logEntry = {
      event,
      timestamp: new Date().toISOString(),
      details
    };
    
    console.log(`🔒 Security Event: ${event}`, logEntry);
  }
  
  // In production, you might want to send this to a monitoring service
  // like DataDog, New Relic, or CloudWatch
}

// Clean up rate limits every 5 minutes
setInterval(cleanupRateLimit, 5 * 60 * 1000);
