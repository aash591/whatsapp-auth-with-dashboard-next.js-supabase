CREATE TABLE IF NOT EXISTS verification_codes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    code VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    whatsapp_number VARCHAR(20) NOT NULL,
    verified BOOLEAN DEFAULT FALSE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    verified_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE verification_codes 
ADD COLUMN IF NOT EXISTS referred_by_code VARCHAR(255),
ADD COLUMN IF NOT EXISTS referral_rewarded BOOLEAN DEFAULT FALSE;

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS referral_code VARCHAR(12) UNIQUE,
ADD COLUMN IF NOT EXISTS referred_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS referral_points INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS available_points INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS referred_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS is_fraudulent BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_vc_referred_by_code ON verification_codes(referred_by_code) WHERE referred_by_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code) WHERE referral_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone) WHERE phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_is_fraudulent ON users(is_fraudulent) WHERE is_fraudulent = TRUE;

UPDATE users 
SET referral_code = UPPER(LEFT(MD5(COALESCE(phone, '') || id::TEXT || random()::TEXT), 6))
WHERE referral_code IS NULL;

ALTER TABLE users 
ALTER COLUMN referral_code SET NOT NULL;

CREATE TABLE IF NOT EXISTS referral_rewards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    referred_id UUID REFERENCES users(id) ON DELETE SET NULL,
    points INTEGER NOT NULL CHECK (points > 0),
    event_type VARCHAR(30) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_referral_reward 
ON referral_rewards(referrer_id, referred_id, event_type)
WHERE referred_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_rewards_referrer_created ON referral_rewards(referrer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rewards_created ON referral_rewards(created_at DESC);

CREATE TABLE IF NOT EXISTS referral_abuse (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone VARCHAR(20),
    referral_code VARCHAR(255),
    reason VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_abuse_phone ON referral_abuse(phone);
CREATE INDEX IF NOT EXISTS idx_abuse_code ON referral_abuse(referral_code);

CREATE TABLE IF NOT EXISTS redemption_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    redemption_type VARCHAR(30) UNIQUE NOT NULL,
    min_points INTEGER NOT NULL CHECK (min_points > 0),
    points_to_currency_ratio DECIMAL(10,4) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS referral_expiry_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    expiry_days INTEGER NOT NULL CHECK (expiry_days > 0),
    is_active BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS referral_redemptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    points_redeemed INTEGER NOT NULL CHECK (points_redeemed > 0),
    amount_redeemed DECIMAL(10,2) NOT NULL CHECK (amount_redeemed > 0),
    redemption_type VARCHAR(30) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    remark TEXT,
    admin_notes TEXT,
    claimed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE,
    processed_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_redemptions_user_claimed ON referral_redemptions(user_id, claimed_at DESC);
CREATE INDEX IF NOT EXISTS idx_redemptions_status_claimed ON referral_redemptions(status, claimed_at DESC);
CREATE INDEX IF NOT EXISTS idx_redemptions_status ON referral_redemptions(status) WHERE status = 'pending';

CREATE OR REPLACE VIEW v_user_referrals AS
SELECT 
    u.id,
    u.name,
    u.phone,
    u.referral_code,
    u.referral_points,
    u.available_points,
    u.referred_at,
    u.verified_at,
    u.is_fraudulent,
    COUNT(r.id) as total_referrals,
    COALESCE(SUM(r.points), 0) as total_points_earned,
    COALESCE(SUM(red.points_redeemed), 0) as total_points_redeemed
FROM users u
LEFT JOIN referral_rewards r ON u.id = r.referrer_id
LEFT JOIN referral_redemptions red ON u.id = red.user_id
GROUP BY u.id, u.name, u.phone, u.referral_code, u.referral_points, u.available_points, u.referred_at, u.verified_at, u.is_fraudulent;

CREATE OR REPLACE VIEW v_referral_leaderboard AS
SELECT 
    u.id,
    u.name,
    u.phone,
    u.referral_code,
    COUNT(r.id) as total_referrals,
    COALESCE(SUM(r.points), 0) as total_points
FROM users u
LEFT JOIN referral_rewards r ON u.id = r.referrer_id
WHERE u.verified = true AND u.is_fraudulent = FALSE
GROUP BY u.id, u.name, u.phone, u.referral_code
ORDER BY total_points DESC, total_referrals DESC;

CREATE OR REPLACE VIEW v_referral_analytics AS
SELECT 
    COUNT(DISTINCT u.id) as total_users,
    COUNT(DISTINCT r.referrer_id) as users_with_referrals,
    COUNT(r.id) as total_referrals,
    COALESCE(SUM(r.points), 0) as total_points_awarded,
    COUNT(DISTINCT red.user_id) as users_with_redemptions,
    COALESCE(SUM(red.points_redeemed), 0) as total_points_redeemed
FROM users u
LEFT JOIN referral_rewards r ON u.id = r.referrer_id
LEFT JOIN referral_redemptions red ON u.id = red.user_id;

CREATE OR REPLACE VIEW v_expired_points AS
SELECT 
    u.id,
    u.name,
    u.phone,
    u.referral_points,
    u.available_points,
    r.created_at as points_earned_at,
    r.created_at + (config.expiry_days || ' days')::INTERVAL as expires_at
FROM users u
JOIN referral_rewards r ON u.id = r.referrer_id
CROSS JOIN (
    SELECT expiry_days FROM referral_expiry_config WHERE is_active = TRUE LIMIT 1
) config
WHERE r.created_at + (config.expiry_days || ' days')::INTERVAL < NOW() + INTERVAL '7 days'
  AND r.created_at + (config.expiry_days || ' days')::INTERVAL > NOW()
ORDER BY expires_at ASC;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'chk_referral_points_non_negative'
    ) THEN
        ALTER TABLE users ADD CONSTRAINT chk_referral_points_non_negative CHECK (referral_points >= 0);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'chk_available_points_non_negative'
    ) THEN
        ALTER TABLE users ADD CONSTRAINT chk_available_points_non_negative CHECK (available_points >= 0);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'chk_points_sync'
    ) THEN
        ALTER TABLE users ADD CONSTRAINT chk_points_sync CHECK (available_points <= referral_points);
    END IF;
END $$;

INSERT INTO redemption_configs (redemption_type, min_points, points_to_currency_ratio, description) 
VALUES 
    ('cash', 100, 0.01, 'Cash redemption - 1 point = $0.01'),
    ('gift_card', 50, 0.02, 'Gift card redemption - 1 point = $0.02')
ON CONFLICT (redemption_type) DO NOTHING;

INSERT INTO referral_expiry_config (expiry_days, is_active) 
VALUES (365, true)
ON CONFLICT DO NOTHING;
