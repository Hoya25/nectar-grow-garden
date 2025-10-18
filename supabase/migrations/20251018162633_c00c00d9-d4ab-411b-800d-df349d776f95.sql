-- Add alliance token type field to earning_opportunities
ALTER TABLE public.earning_opportunities 
ADD COLUMN IF NOT EXISTS alliance_token_type text DEFAULT 'partner_token';

COMMENT ON COLUMN public.earning_opportunities.alliance_token_type IS 'Type of alliance token: partner_token, creator_coin, community_token, etc.';