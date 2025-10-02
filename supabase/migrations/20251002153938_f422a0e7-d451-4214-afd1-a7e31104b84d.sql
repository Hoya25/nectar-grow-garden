-- Fix Fanatics affiliate link to point to the actual fanatics.com website
-- Update the URL parameter in the Impact.com tracking link to use the correct destination

UPDATE earning_opportunities 
SET affiliate_link = 'https://go.impact.com/campaign-promo/IR4GaqK4ERBS3036244ogjTZ3J7wvbWcw1/9663?url=https%3A%2F%2Fwww.fanatics.com',
    brand_id = (SELECT id FROM brands WHERE name = 'Fanatics' AND loyalize_id = '10231' LIMIT 1)
WHERE id = 'e58b75c2-cb06-42a4-a903-810c96ca8e73'
  AND partner_name = 'Fanatics'
  AND title = 'Shop with Fanatics';