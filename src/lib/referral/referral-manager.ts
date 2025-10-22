/**
 * Referral System Manager
 * Handles all referral-related operations
 */

import { supabase } from '@/lib/database/supabase';

export interface ReferralStats {
  referralCode: string;
  totalReferrals: number;
  successfulReferrals: number;
  pendingReferrals: number;
  totalPoints: number;
  availablePoints: number;
  totalEarnings: number;
  referralsThisMonth: number;
}

export interface ReferredUser {
  id: string;
  name: string;
  phone: string;
  verified: boolean;
  verifiedAt: string | null;
  referredAt: string;
}

/**
 * Validate if a referral code exists and is active
 * @param code - Referral code to validate
 * @returns Referrer information or null
 */
export async function validateReferralCode(code: string): Promise<{
  isValid: boolean;
  referrerId?: string;
  referrerName?: string;
} | null> {
  if (!code || code.length < 6) {
    return { isValid: false };
  }


  const { data, error } = await supabase
    .from('users')
    .select('id, name')
    .eq('referral_code', code.toUpperCase())
    .eq('verified', true)
    .single();

  if (error || !data) {
    return { isValid: false };
  }

  return {
    isValid: true,
    referrerId: data.id,
    referrerName: data.name
  };
}

/**
 * Get referral statistics for a user
 * @param userId - User ID
 * @returns Referral statistics
 */
export async function getUserReferralStats(userId: string): Promise<ReferralStats | null> {

  // Get user's referral info
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('referral_code, referral_count, successful_referrals, referral_points, available_points, referral_earnings')
    .eq('id', userId)
    .single();

  if (userError || !user) {
    return null;
  }

  // Get referred users count by status
  const { data: referredUsers, error: referredError } = await supabase
    .from('verification_codes')
    .select('verified, verified_at, created_at')
    .eq('referred_by_user_id', userId);

  if (referredError) {
    console.error('Error fetching referred users:', referredError);
  }

  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const pendingCount = referredUsers?.filter(u => !u.verified).length || 0;
  const referralsThisMonth = referredUsers?.filter(
    u => u.verified && u.verified_at && new Date(u.verified_at) >= firstDayOfMonth
  ).length || 0;

  return {
    referralCode: user.referral_code || '',
    totalReferrals: user.referral_count || 0,
    successfulReferrals: user.successful_referrals || 0,
    pendingReferrals: pendingCount,
    totalPoints: user.referral_points || 0,
    availablePoints: user.available_points || 0,
    totalEarnings: parseFloat(user.referral_earnings || '0'),
    referralsThisMonth
  };
}

/**
 * Get list of users referred by a user
 * @param userId - Referrer user ID
 * @returns Array of referred users
 */
export async function getReferredUsers(userId: string): Promise<ReferredUser[]> {

  const { data, error } = await supabase
    .from('users')
    .select('id, name, phone, verified, verified_at, created_at')
    .eq('referred_by_user_id', userId)
    .order('created_at', { ascending: false });

  if (error || !data) {
    return [];
  }

  return data.map(user => ({
    id: user.id,
    name: user.name,
    phone: user.phone,
    verified: user.verified || false,
    verifiedAt: user.verified_at,
    referredAt: user.created_at
  }));
}

/**
 * Create referral relationship
 * @param referrerId - ID of the user who referred
 * @param referredId - ID of the user who was referred
 * @returns Success status
 */
export async function createReferralRelationship(
  referrerId: string,
  referredId: string
): Promise<boolean> {

  const { error } = await supabase
    .from('users')
    .update({ referred_by_user_id: referrerId })
    .eq('id', referredId);

  return !error;
}

/**
 * Increment referral count for a user
 * @param userId - User ID
 * @returns Success status
 */
export async function incrementReferralCount(userId: string): Promise<boolean> {

  const { error } = await supabase
    .rpc('increment_referral_count', { user_id: userId });

  if (error) {
    // Fallback: manual increment
    const { data: user } = await supabase
      .from('users')
      .select('referral_count')
      .eq('id', userId)
      .single();

    if (user) {
      await supabase
        .from('users')
        .update({ referral_count: (user.referral_count || 0) + 1 })
        .eq('id', userId);
    }
  }

  return true;
}

















