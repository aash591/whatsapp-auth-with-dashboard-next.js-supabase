/**
 * Database Table Types
 * Generated types matching Supabase schema
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          name: string
          phone: string
          email: string | null
          password_hash: string | null
          verified: boolean
          verified_at: string | null
          referral_code: string | null
          referred_by_user_id: string | null
          referral_count: number
          successful_referrals: number
          referral_points: number
          available_points: number
          referral_earnings: number
          is_fraudulent: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          phone: string
          email?: string | null
          password_hash?: string | null
          verified?: boolean
          verified_at?: string | null
          referral_code?: string | null
          referred_by_user_id?: string | null
          referral_count?: number
          successful_referrals?: number
          referral_points?: number
          available_points?: number
          referral_earnings?: number
          is_fraudulent?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          phone?: string
          email?: string | null
          password_hash?: string | null
          verified?: boolean
          verified_at?: string | null
          referral_code?: string | null
          referred_by_user_id?: string | null
          referral_count?: number
          successful_referrals?: number
          referral_points?: number
          available_points?: number
          referral_earnings?: number
          is_fraudulent?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      verification_codes: {
        Row: {
          id: string
          code: string
          name: string
          whatsapp_number: string
          verified: boolean
          verified_at: string | null
          expires_at: string
          referred_by_code: string | null
          referred_by_user_id: string | null
          referral_status: string
          referral_rewarded_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          code: string
          name: string
          whatsapp_number: string
          verified?: boolean
          verified_at?: string | null
          expires_at: string
          referred_by_code?: string | null
          referred_by_user_id?: string | null
          referral_status?: string
          referral_rewarded_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          code?: string
          name?: string
          whatsapp_number?: string
          verified?: boolean
          verified_at?: string | null
          expires_at?: string
          referred_by_code?: string | null
          referred_by_user_id?: string | null
          referral_status?: string
          referral_rewarded_at?: string | null
          created_at?: string
        }
      }
      referral_rewards: {
        Row: {
          id: string
          event_type: string
          points: number
          monetary_value: number
          is_active: boolean
          description: string | null
          created_at: string
        }
        Insert: {
          id?: string
          event_type: string
          points: number
          monetary_value?: number
          is_active?: boolean
          description?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          event_type?: string
          points?: number
          monetary_value?: number
          is_active?: boolean
          description?: string | null
          created_at?: string
        }
      }
      referral_events: {
        Row: {
          id: string
          referrer_id: string
          referred_id: string | null
          verification_code_id: string | null
          event_type: string
          points_awarded: number
          amount_awarded: number
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          referrer_id: string
          referred_id?: string | null
          verification_code_id?: string | null
          event_type: string
          points_awarded?: number
          amount_awarded?: number
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          referrer_id?: string
          referred_id?: string | null
          verification_code_id?: string | null
          event_type?: string
          points_awarded?: number
          amount_awarded?: number
          metadata?: Json | null
          created_at?: string
        }
      }
      referral_abuse: {
        Row: {
          id: string
          user_id: string
          referral_code: string
          abuse_type: string
          detected_at: string
          metadata: Json | null
        }
        Insert: {
          id?: string
          user_id: string
          referral_code: string
          abuse_type: string
          detected_at?: string
          metadata?: Json | null
        }
        Update: {
          id?: string
          user_id?: string
          referral_code?: string
          abuse_type?: string
          detected_at?: string
          metadata?: Json | null
        }
      }
      redemption_configs: {
        Row: {
          id: string
          min_points_required: number
          reward_name: string
          reward_description: string | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          min_points_required: number
          reward_name: string
          reward_description?: string | null
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          min_points_required?: number
          reward_name?: string
          reward_description?: string | null
          is_active?: boolean
          created_at?: string
        }
      }
      referral_redemptions: {
        Row: {
          id: string
          user_id: string
          points_redeemed: number
          reward_config_id: string | null
          status: string
          admin_notes: string | null
          redeemed_at: string
          processed_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          points_redeemed: number
          reward_config_id?: string | null
          status?: string
          admin_notes?: string | null
          redeemed_at?: string
          processed_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          points_redeemed?: number
          reward_config_id?: string | null
          status?: string
          admin_notes?: string | null
          redeemed_at?: string
          processed_at?: string | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}

