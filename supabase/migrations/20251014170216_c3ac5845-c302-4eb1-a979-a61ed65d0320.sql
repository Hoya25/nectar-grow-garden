-- Add Alliance Token fields to earning_opportunities table
ALTER TABLE public.earning_opportunities
ADD COLUMN alliance_token_enabled boolean DEFAULT false,
ADD COLUMN alliance_token_name text,
ADD COLUMN alliance_token_symbol text,
ADD COLUMN alliance_token_logo_url text,
ADD COLUMN alliance_token_ratio numeric DEFAULT 0,
ADD COLUMN alliance_token_lock_days integer DEFAULT 90;

-- Add comment for clarity
COMMENT ON COLUMN public.earning_opportunities.alliance_token_enabled IS 'Whether this opportunity offers alliance tokens';
COMMENT ON COLUMN public.earning_opportunities.alliance_token_name IS 'Full name of the alliance token (e.g., "Base Token")';
COMMENT ON COLUMN public.earning_opportunities.alliance_token_symbol IS 'Token symbol (e.g., "BASE")';
COMMENT ON COLUMN public.earning_opportunities.alliance_token_logo_url IS 'URL to alliance token logo image';
COMMENT ON COLUMN public.earning_opportunities.alliance_token_ratio IS 'Alliance tokens earned per $1 spent';
COMMENT ON COLUMN public.earning_opportunities.alliance_token_lock_days IS 'Lock period in days for alliance tokens';