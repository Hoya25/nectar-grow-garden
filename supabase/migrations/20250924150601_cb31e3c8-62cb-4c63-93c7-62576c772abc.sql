-- Enable required extensions for cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Update initial NCTR price to correct value
UPDATE public.nctr_price_cache 
SET price_usd = 0.088, source = 'manual_correction', updated_at = now()
WHERE id = (SELECT id FROM public.nctr_price_cache ORDER BY updated_at DESC LIMIT 1);

-- Set up cron job to update NCTR price every 5 minutes
SELECT cron.schedule(
  'update-nctr-price-every-5min',
  '*/5 * * * *', -- every 5 minutes
  $$
  select
    net.http_post(
        url:='https://rndivcsonsojgelzewkb.supabase.co/functions/v1/nctr-price-updater',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJuZGl2Y3NvbnNvamdlbHpld2tiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg0NzEwNTksImV4cCI6MjA3NDA0NzA1OX0.N4_RL-IclVLuTmAhoHRZvSgNfNKfivLg5mS2_rgNtuc"}'::jsonb,
        body:='{"scheduled": true}'::jsonb
    ) as request_id;
  $$
);