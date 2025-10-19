// This file is now replaced by lib/supabaseAdmin.ts
// Keeping for backward compatibility
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface VerificationCode {
  id: string;
  code: string;
  name: string;
  whatsapp_number: string;
  verified: boolean;
  created_at: string;
  verified_at?: string;
}

