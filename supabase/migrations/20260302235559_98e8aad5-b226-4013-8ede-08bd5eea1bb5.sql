-- Update Crescendo tier multipliers to canonical values
UPDATE opportunity_status_levels SET reward_multiplier = 1.00 WHERE status_name = 'starter';
UPDATE opportunity_status_levels SET reward_multiplier = 1.00 WHERE status_name = 'bronze';
UPDATE opportunity_status_levels SET reward_multiplier = 1.25 WHERE status_name = 'silver';
UPDATE opportunity_status_levels SET reward_multiplier = 1.50 WHERE status_name = 'gold';
UPDATE opportunity_status_levels SET reward_multiplier = 2.00 WHERE status_name = 'platinum';
UPDATE opportunity_status_levels SET reward_multiplier = 2.50 WHERE status_name = 'diamond';

-- Add reward_multiplier column to status_tiers if not exists
ALTER TABLE status_tiers ADD COLUMN IF NOT EXISTS reward_multiplier numeric NOT NULL DEFAULT 1.0;

-- Set multipliers on status_tiers table too
UPDATE status_tiers SET reward_multiplier = 1.00 WHERE tier_name = 'bronze';
UPDATE status_tiers SET reward_multiplier = 1.25 WHERE tier_name = 'silver';
UPDATE status_tiers SET reward_multiplier = 1.50 WHERE tier_name = 'gold';
UPDATE status_tiers SET reward_multiplier = 2.00 WHERE tier_name = 'platinum';
UPDATE status_tiers SET reward_multiplier = 2.50 WHERE tier_name = 'diamond';