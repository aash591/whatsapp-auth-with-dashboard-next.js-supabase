/**
 * Referral System - Central Export
 * Consolidates all referral-related utilities
 */

export {
  validateReferralCode,
  getUserReferralStats,
  getReferredUsers,
  createReferralRelationship,
  incrementReferralCount
} from './referral-manager';

export type {
  ReferralStats,
  ReferredUser
} from './referral-manager';


