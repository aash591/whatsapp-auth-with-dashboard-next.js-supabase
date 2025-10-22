/**
 * Shared TypeScript Types
 * Central type definitions for the application
 */

// ============================================
// User Types
// ============================================

export interface User {
  id: string;
  name: string;
  phone: string;
  email?: string;
  verified: boolean;
  verified_at?: string;
  referral_code?: string;
  referred_by_user_id?: string;
  referral_count?: number;
  successful_referrals?: number;
  referral_points?: number;
  available_points?: number;
  referral_earnings?: number;
  is_fraudulent?: boolean;
  created_at: string;
  updated_at?: string;
}

// ============================================
// Verification Types
// ============================================

export interface VerificationCode {
  id: string;
  code: string;
  name: string;
  whatsapp_number: string;
  verified: boolean;
  verified_at?: string;
  expires_at: string;
  referred_by_code?: string;
  referred_by_user_id?: string;
  referral_status?: 'none' | 'pending' | 'rewarded';
  referral_rewarded_at?: string;
  created_at: string;
}

// ============================================
// Referral Types
// ============================================

export interface ReferralReward {
  id: string;
  event_type: string;
  points: number;
  monetary_value: number;
  is_active: boolean;
  description?: string;
  created_at: string;
}

export interface ReferralEvent {
  id: string;
  referrer_id: string;
  referred_id?: string;
  verification_code_id?: string;
  event_type: string;
  points_awarded: number;
  amount_awarded: number;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface ReferralAbuse {
  id: string;
  user_id: string;
  referral_code: string;
  abuse_type: string;
  detected_at: string;
  metadata?: Record<string, any>;
}

export interface RedemptionConfig {
  id: string;
  min_points_required: number;
  reward_name: string;
  reward_description?: string;
  is_active: boolean;
  created_at: string;
}

export interface ReferralRedemption {
  id: string;
  user_id: string;
  points_redeemed: number;
  reward_config_id?: string;
  status: 'pending' | 'approved' | 'rejected';
  admin_notes?: string;
  redeemed_at: string;
  processed_at?: string;
}

// ============================================
// Session Types
// ============================================

export interface TempSession {
  sessionId: string;
  phone: string;
  referralCode?: string;
  name?: string;
  expiresAt: number;
}

export interface SessionData {
  user: {
    id: string;
    name: string;
    phone: string;
    verified: boolean;
    referral_code?: string;
    referral_points?: number;
    available_points?: number;
  };
  expiresAt: number;
}

// ============================================
// API Response Types
// ============================================

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends APIResponse<T[]> {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ============================================
// CSRF Types
// ============================================

export interface CSRFTokenResponse {
  success: boolean;
  token: string;
  expiresIn: number;
  message?: string;
}

// ============================================
// Rate Limit Types
// ============================================

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfter?: number;
}

// ============================================
// Security Types
// ============================================

export interface SecurityOptions {
  requireCSRF?: boolean;
  rateLimit?: {
    maxRequests: number;
    windowMs: number;
  };
  requireOrigin?: boolean;
}

export interface CookieOptions {
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'strict' | 'lax' | 'none';
  maxAge?: number;
  path?: string;
}

