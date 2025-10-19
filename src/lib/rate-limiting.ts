/**
 * Rate Limiting Implementation for Vercel Free Tier
 * Uses in-memory storage with cleanup to avoid external dependencies
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
  lastRequest: number;
}

// In-memory rate limit store
const rateLimitStore = new Map<string, RateLimitEntry>();

// Rate limit configurations
export const RATE_LIMITS = {
  // API endpoints
  api: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 50, // Reduced from 100 for security
    keyGenerator: (request: Request) => {
      const ip = request.headers.get('x-forwarded-for') || 
                 request.headers.get('x-real-ip') || 
                 'unknown';
      const userAgent = request.headers.get('user-agent') || 'unknown';
      // Combine IP and User-Agent for better fingerprinting
      return `api:${ip}:${userAgent.slice(0, 20)}`;
    }
  },
  
  // Authentication endpoints
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5, // Reduced from 10 for security
    keyGenerator: (request: Request) => {
      const ip = request.headers.get('x-forwarded-for') || 
                 request.headers.get('x-real-ip') || 
                 'unknown';
      const userAgent = request.headers.get('user-agent') || 'unknown';
      // Combine IP and User-Agent for better fingerprinting
      return `auth:${ip}:${userAgent.slice(0, 20)}`;
    }
  },
  
  // Password reset
  passwordReset: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 2, // Reduced from 3 for security
    keyGenerator: (request: Request) => {
      const ip = request.headers.get('x-forwarded-for') || 
                 request.headers.get('x-real-ip') || 
                 'unknown';
      const userAgent = request.headers.get('user-agent') || 'unknown';
      // Combine IP and User-Agent for better fingerprinting
      return `password_reset:${ip}:${userAgent.slice(0, 20)}`;
    }
  },
  
  // WhatsApp webhook
  webhook: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 30, // Reduced from 50 for security
    keyGenerator: (request: Request) => {
      const ip = request.headers.get('x-forwarded-for') || 
                 request.headers.get('x-real-ip') || 
                 'unknown';
      const userAgent = request.headers.get('user-agent') || 'unknown';
      // Combine IP and User-Agent for better fingerprinting
      return `webhook:${ip}:${userAgent.slice(0, 20)}`;
    }
  }
};

/**
 * Check if request is within rate limit
 * @param request - Request object
 * @param limitType - Type of rate limit to apply
 * @returns Rate limit status
 */
export function checkRateLimit(
  request: Request, 
  limitType: keyof typeof RATE_LIMITS
): {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
} {
  const config = RATE_LIMITS[limitType];
  const key = config.keyGenerator(request);
  const now = Date.now();
  
  // Clean up expired entries
  cleanupExpiredEntries();
  
  const entry = rateLimitStore.get(key);
  
  if (!entry) {
    // First request
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + config.windowMs,
      lastRequest: now
    });
    
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetTime: now + config.windowMs
    };
  }
  
  // Check if window has expired
  if (now > entry.resetTime) {
    // Reset the counter
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + config.windowMs,
      lastRequest: now
    });
    
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetTime: now + config.windowMs
    };
  }
  
  // Check if limit exceeded
  if (entry.count >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: entry.resetTime,
      retryAfter: Math.ceil((entry.resetTime - now) / 1000)
    };
  }
  
  // Increment counter
  entry.count++;
  entry.lastRequest = now;
  rateLimitStore.set(key, entry);
  
  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetTime: entry.resetTime
  };
}

/**
 * Clean up expired rate limit entries
 */
function cleanupExpiredEntries(): void {
  const now = Date.now();
  const keysToDelete: string[] = [];
  
  rateLimitStore.forEach((entry, key) => {
    if (now > entry.resetTime) {
      keysToDelete.push(key);
    }
  });
  
  keysToDelete.forEach(key => rateLimitStore.delete(key));
}

/**
 * Get rate limit status for a key
 * @param key - Rate limit key
 * @returns Rate limit status
 */
export function getRateLimitStatus(key: string): {
  count: number;
  remaining: number;
  resetTime: number;
  isLimited: boolean;
} {
  const entry = rateLimitStore.get(key);
  
  if (!entry) {
    return {
      count: 0,
      remaining: 100, // Default limit
      resetTime: Date.now() + 15 * 60 * 1000,
      isLimited: false
    };
  }
  
  const now = Date.now();
  const isExpired = now > entry.resetTime;
  
  if (isExpired) {
    return {
      count: 0,
      remaining: 100,
      resetTime: now + 15 * 60 * 1000,
      isLimited: false
    };
  }
  
  return {
    count: entry.count,
    remaining: Math.max(0, 100 - entry.count),
    resetTime: entry.resetTime,
    isLimited: entry.count >= 100
  };
}

/**
 * Create rate limit response
 * @param retryAfter - Seconds to wait before retry
 * @returns Rate limit exceeded response
 */
export function createRateLimitResponse(retryAfter: number): Response {
  return new Response(
    JSON.stringify({
      success: false,
      error: 'Rate limit exceeded',
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': retryAfter.toString(),
        'X-RateLimit-Limit': '100',
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': new Date(Date.now() + retryAfter * 1000).toISOString()
      }
    }
  );
}

// Clean up expired entries every 5 minutes
setInterval(cleanupExpiredEntries, 5 * 60 * 1000);
