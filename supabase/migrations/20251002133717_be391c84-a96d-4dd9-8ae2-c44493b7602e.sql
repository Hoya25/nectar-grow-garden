-- Update all existing Loyalize redirect links to use correct format
-- Changes: store_id -> store, removes URL encoding from placeholders

UPDATE earning_opportunities
SET affiliate_link = REPLACE(
  REPLACE(
    REPLACE(affiliate_link, 'store_id=', 'store='),
    'user_id=%7B%7BUSER_ID%7D%7D',
    'user={{USER_ID}}'
  ),
  'tracking_id=%7B%7BTRACKING_ID%7D%7D',
  'tracking={{TRACKING_ID}}'
)
WHERE affiliate_link LIKE '%loyalize-redirect%'
  AND (
    affiliate_link LIKE '%store_id=%' 
    OR affiliate_link LIKE '%7B%7B%'
  );