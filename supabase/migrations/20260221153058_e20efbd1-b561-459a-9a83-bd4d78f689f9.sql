-- Insert the INSPIRATION Partner tag
INSERT INTO brand_tags (name, slug, icon, description, display_order)
VALUES ('INSPIRATION Partner', 'inspiration', '✨', 'Part of the INSPIRATION wellness ecosystem', 1)
ON CONFLICT (slug) DO NOTHING;

-- Assign the tag to Kroma Wellness
INSERT INTO brand_tag_assignments (brand_id, tag_id)
SELECT '637ae486-2ee7-4574-88cd-876771c59404', id
FROM brand_tags WHERE slug = 'inspiration'
ON CONFLICT DO NOTHING;