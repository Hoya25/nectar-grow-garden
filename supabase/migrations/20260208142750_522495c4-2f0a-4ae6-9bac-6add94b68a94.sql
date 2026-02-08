
-- Insert Feals as a featured brand partner
INSERT INTO public.brands (
  name,
  logo_url,
  website_url,
  category,
  nctr_per_dollar,
  description,
  featured,
  is_active,
  is_big_brand,
  commission_rate
) VALUES (
  'Feals',
  'https://feals.com/cdn/shop/files/2025-feals-logo-brown_360x.svg',
  'https://feals.com',
  'Wellness',
  3,
  'Premium CBD products for stress relief, better sleep, and daily calm. Feel better without the fuzzy haze.',
  true,
  true,
  false,
  0.15
);

-- Ensure "Wellness" category exists
INSERT INTO public.brand_categories (name, slug, icon, description, is_active, display_order)
VALUES ('Wellness', 'wellness', '🧘', 'Health, wellness, and self-care brands', true, 10)
ON CONFLICT (slug) DO NOTHING;
