
-- Create woman-founded brand tag
INSERT INTO brand_tags (name, slug, icon, description, display_order, is_active)
VALUES ('Woman-Founded', 'woman-founded', '👩‍💼', 'Founded by a woman entrepreneur', 5, true);

-- Insert Kroma Wellness brand
INSERT INTO brands (
  name, description, category, website_url, logo_url,
  commission_rate, nctr_per_dollar, is_active, featured, is_big_brand,
  display_order, is_promoted, promotion_label, promotion_multiplier
) VALUES (
  'Kroma Wellness',
  'Superfood nutrition that makes healthy taste amazing. Founded by Lisa Odenweller — food as medicine, backed by science.',
  'Health & Wellness',
  'https://kromawellness.com',
  NULL,
  0.10, 3, true, true, false,
  1, false, NULL, 1.0
);

-- Assign tags to Kroma Wellness
INSERT INTO brand_tag_assignments (brand_id, tag_id)
SELECT b.id, t.id
FROM brands b, brand_tags t
WHERE b.name = 'Kroma Wellness'
AND t.slug IN ('small-business', 'sustainable', 'woman-founded');
