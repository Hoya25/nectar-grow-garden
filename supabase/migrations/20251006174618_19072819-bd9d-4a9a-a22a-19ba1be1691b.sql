-- Create table for Shopify orders tracking
CREATE TABLE IF NOT EXISTS public.shopify_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  shopify_order_id TEXT NOT NULL UNIQUE,
  order_number TEXT,
  total_price NUMERIC NOT NULL,
  currency TEXT DEFAULT 'USD',
  customer_email TEXT,
  referral_code TEXT,
  referrer_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  nctr_awarded NUMERIC DEFAULT 0,
  nctr_credited BOOLEAN DEFAULT FALSE,
  order_status TEXT DEFAULT 'pending',
  order_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX idx_shopify_orders_user_id ON public.shopify_orders(user_id);
CREATE INDEX idx_shopify_orders_referrer ON public.shopify_orders(referrer_user_id);
CREATE INDEX idx_shopify_orders_shopify_id ON public.shopify_orders(shopify_order_id);

-- Enable RLS
ALTER TABLE public.shopify_orders ENABLE ROW LEVEL SECURITY;

-- Users can view their own orders
CREATE POLICY "Users can view their own Shopify orders"
ON public.shopify_orders
FOR SELECT
USING (auth.uid() = user_id OR auth.uid() = referrer_user_id);

-- Admins can view all orders
CREATE POLICY "Admins can view all Shopify orders"
ON public.shopify_orders
FOR SELECT
USING (check_user_is_admin(auth.uid()));

-- Service role can manage orders (for webhook)
CREATE POLICY "Service role can manage Shopify orders"
ON public.shopify_orders
FOR ALL
USING (auth.role() = 'service_role');

-- Create merch opportunities entry
INSERT INTO public.earning_opportunities (
  title,
  description,
  opportunity_type,
  partner_name,
  reward_per_dollar,
  is_active,
  featured,
  display_order,
  default_lock_type,
  reward_distribution_type,
  cta_text
) VALUES (
  'NCTR Merch Store',
  'Shop official NCTR merchandise and earn rewards on every purchase! Get 1 NCTR per dollar spent, plus help spread the word with unique affiliate links.',
  'shopping',
  'NCTR Shop',
  1.0,
  true,
  true,
  1,
  '90LOCK',
  'combined',
  'Shop Merch'
) ON CONFLICT DO NOTHING;