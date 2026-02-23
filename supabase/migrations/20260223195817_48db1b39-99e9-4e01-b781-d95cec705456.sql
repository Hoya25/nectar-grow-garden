-- Create Onda Beauty and Remedy Place as inactive/coming-soon brands
INSERT INTO brands (name, category, is_active, description, loyalize_id, display_order)
VALUES 
  ('Onda Beauty', 'Health & Beauty', true, 'Clean beauty, curated', NULL, 10),
  ('Remedy Place', 'Health & Wellness', true, 'Social wellness club', NULL, 11)
ON CONFLICT DO NOTHING;

-- Remove Feals from INSPIRATION tag
DELETE FROM brand_tag_assignments 
WHERE brand_id = '74e86e73-80bc-4c3e-b5c3-85c70da5ab55' 
  AND tag_id = '213afda0-3fc8-4a57-a7ec-20720af64e68';