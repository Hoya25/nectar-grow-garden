-- Tag Cymbiotika as INSPIRATION Partner
INSERT INTO brand_tag_assignments (brand_id, tag_id) 
VALUES ('3bad07be-4b6a-4181-a364-d5d1e155b25f', '213afda0-3fc8-4a57-a7ec-20720af64e68')
ON CONFLICT DO NOTHING;

-- Tag Feals as INSPIRATION Partner  
INSERT INTO brand_tag_assignments (brand_id, tag_id)
VALUES ('74e86e73-80bc-4c3e-b5c3-85c70da5ab55', '213afda0-3fc8-4a57-a7ec-20720af64e68')
ON CONFLICT DO NOTHING;