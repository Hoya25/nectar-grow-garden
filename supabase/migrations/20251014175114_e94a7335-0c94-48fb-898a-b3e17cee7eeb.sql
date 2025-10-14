-- Increase alliance_token_logo_url field length to support base64 images
-- Base64 images can be quite large, so we'll use TEXT instead of VARCHAR
ALTER TABLE public.earning_opportunities 
  ALTER COLUMN alliance_token_logo_url TYPE TEXT;