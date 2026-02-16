-- Backfill shopping_clicks from affiliate_link_mappings (only where brand still exists)
INSERT INTO shopping_clicks (user_id, brand_id, loyalize_id, clicked_at, converted, nctr_earned)
SELECT alm.user_id, alm.brand_id, b.loyalize_id, alm.created_at::timestamp without time zone, false, 0
FROM affiliate_link_mappings alm
INNER JOIN brands b ON alm.brand_id = b.id
WHERE alm.user_id IS NOT NULL
ON CONFLICT DO NOTHING;