-- Tag Onda Beauty and Remedy Place as INSPIRATION partners
INSERT INTO brand_tag_assignments (brand_id, tag_id)
VALUES 
  ('5ddc17d6-b5f5-4abc-b617-15294bb35e39', '213afda0-3fc8-4a57-a7ec-20720af64e68'),
  ('24fe6b85-4944-4352-8877-458c61b6e61d', '213afda0-3fc8-4a57-a7ec-20720af64e68')
ON CONFLICT DO NOTHING;