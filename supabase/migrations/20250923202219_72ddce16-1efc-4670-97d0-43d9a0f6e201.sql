-- Add columns to track NCTR sources in portfolio
ALTER TABLE public.nctr_portfolio 
ADD COLUMN nctr_live_available numeric DEFAULT 0,
ADD COLUMN nctr_live_lock_360 numeric DEFAULT 0,
ADD COLUMN nctr_live_total numeric DEFAULT 0,
ADD COLUMN last_sync_at timestamp with time zone DEFAULT NULL;

-- Add index for sync tracking
CREATE INDEX idx_nctr_portfolio_sync ON public.nctr_portfolio(last_sync_at);

-- Add comments for clarity
COMMENT ON COLUMN public.nctr_portfolio.nctr_live_available IS 'Available NCTR synced from token.nctr.live';
COMMENT ON COLUMN public.nctr_portfolio.nctr_live_lock_360 IS '360LOCK NCTR synced from token.nctr.live';
COMMENT ON COLUMN public.nctr_portfolio.nctr_live_total IS 'Total NCTR synced from token.nctr.live';
COMMENT ON COLUMN public.nctr_portfolio.last_sync_at IS 'Last time portfolio was synced with token.nctr.live';