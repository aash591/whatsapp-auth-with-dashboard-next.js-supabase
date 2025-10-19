-- Make referral_code nullable so users can sign up without referral
ALTER TABLE users 
ALTER COLUMN referral_code DROP NOT NULL;

-- Update the constraint to allow NULL referral codes
DROP CONSTRAINT IF EXISTS chk_referral_code_not_null ON users;

-- Add a new constraint that allows NULL but ensures uniqueness when not NULL
ALTER TABLE users 
ADD CONSTRAINT chk_referral_code_unique_when_not_null 
UNIQUE (referral_code) 
WHERE referral_code IS NOT NULL;

-- Update existing users who don't have referral codes to generate them
UPDATE users 
SET referral_code = UPPER(LEFT(MD5(COALESCE(phone, '') || id::TEXT || random()::TEXT), 6))
WHERE referral_code IS NULL;

-- Now make it NOT NULL again after populating existing users
ALTER TABLE users 
ALTER COLUMN referral_code SET NOT NULL;
