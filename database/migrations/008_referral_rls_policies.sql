-- Enable RLS on all referral tables
ALTER TABLE referral_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_abuse ENABLE ROW LEVEL SECURITY;
ALTER TABLE redemption_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_expiry_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_redemptions ENABLE ROW LEVEL SECURITY;

-- Enable RLS on views (if needed)
ALTER VIEW v_user_referrals SET (security_invoker = true);
ALTER VIEW v_referral_leaderboard SET (security_invoker = true);
ALTER VIEW v_referral_analytics SET (security_invoker = true);
ALTER VIEW v_expired_points SET (security_invoker = true);

-- ============================================
-- REFERRAL_REWARDS TABLE POLICIES
-- ============================================

-- Users can only see their own referral rewards (as referrer)
DROP POLICY IF EXISTS "Users can view own referral rewards" ON referral_rewards;
CREATE POLICY "Users can view own referral rewards" ON referral_rewards
    FOR SELECT USING (referrer_id = auth.uid()::uuid);

-- Users can see rewards where they were referred (as referred user)
DROP POLICY IF EXISTS "Users can view rewards where they were referred" ON referral_rewards;
CREATE POLICY "Users can view rewards where they were referred" ON referral_rewards
    FOR SELECT USING (referred_id = auth.uid()::uuid);

-- Service role can manage all referral rewards
DROP POLICY IF EXISTS "Service role can manage all referral rewards" ON referral_rewards;
CREATE POLICY "Service role can manage all referral rewards" ON referral_rewards
    FOR ALL USING (auth.role() = 'service_role');

-- ============================================
-- REFERRAL_REDEMPTIONS TABLE POLICIES
-- ============================================

-- Users can only see their own redemption requests
DROP POLICY IF EXISTS "Users can view own redemptions" ON referral_redemptions;
CREATE POLICY "Users can view own redemptions" ON referral_redemptions
    FOR SELECT USING (user_id = auth.uid()::uuid);

-- Users can insert their own redemption requests
DROP POLICY IF EXISTS "Users can create own redemptions" ON referral_redemptions;
CREATE POLICY "Users can create own redemptions" ON referral_redemptions
    FOR INSERT WITH CHECK (user_id = auth.uid()::uuid);

-- Service role can manage all redemptions
DROP POLICY IF EXISTS "Service role can manage all redemptions" ON referral_redemptions;
CREATE POLICY "Service role can manage all redemptions" ON referral_redemptions
    FOR ALL USING (auth.role() = 'service_role');

-- ============================================
-- REDEMPTION_CONFIGS TABLE POLICIES
-- ============================================

-- Users can read active redemption configurations
DROP POLICY IF EXISTS "Users can view active redemption configs" ON redemption_configs;
CREATE POLICY "Users can view active redemption configs" ON redemption_configs
    FOR SELECT USING (is_active = true);

-- Service role can manage all redemption configs
DROP POLICY IF EXISTS "Service role can manage redemption configs" ON redemption_configs;
CREATE POLICY "Service role can manage redemption configs" ON redemption_configs
    FOR ALL USING (auth.role() = 'service_role');

-- ============================================
-- REFERRAL_EXPIRY_CONFIG TABLE POLICIES
-- ============================================

-- Users can read active expiry configuration
DROP POLICY IF EXISTS "Users can view active expiry config" ON referral_expiry_config;
CREATE POLICY "Users can view active expiry config" ON referral_expiry_config
    FOR SELECT USING (is_active = true);

-- Service role can manage expiry config
DROP POLICY IF EXISTS "Service role can manage expiry config" ON referral_expiry_config;
CREATE POLICY "Service role can manage expiry config" ON referral_expiry_config
    FOR ALL USING (auth.role() = 'service_role');

-- ============================================
-- REFERRAL_ABUSE TABLE POLICIES
-- ============================================

-- Only service role can access abuse data
DROP POLICY IF EXISTS "Only service role can access abuse data" ON referral_abuse;
CREATE POLICY "Only service role can access abuse data" ON referral_abuse
    FOR ALL USING (auth.role() = 'service_role');

-- ============================================
-- USERS TABLE ADDITIONAL POLICIES
-- ============================================

-- Users can view their own referral stats
DROP POLICY IF EXISTS "Users can view own referral stats" ON users;
CREATE POLICY "Users can view own referral stats" ON users
    FOR SELECT USING (id = auth.uid()::uuid);

-- Users can view other users' public referral info (for leaderboard)
DROP POLICY IF EXISTS "Users can view public referral info" ON users;
CREATE POLICY "Users can view public referral info" ON users
    FOR SELECT USING (
        verified = true 
        AND is_fraudulent = false 
        AND referral_code IS NOT NULL
    );

-- ============================================
-- VERIFICATION_CODES TABLE POLICIES
-- ============================================

-- Users can view their own verification codes
DROP POLICY IF EXISTS "Users can view own verification codes" ON verification_codes;
CREATE POLICY "Users can view own verification codes" ON verification_codes
    FOR SELECT USING (whatsapp_number = auth.jwt() ->> 'phone');

-- Service role can manage all verification codes
DROP POLICY IF EXISTS "Service role can manage verification codes" ON verification_codes;
CREATE POLICY "Service role can manage verification codes" ON verification_codes
    FOR ALL USING (auth.role() = 'service_role');
