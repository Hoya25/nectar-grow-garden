-- Delete NoBull affiliate link clicks first
DELETE FROM affiliate_link_clicks 
WHERE link_id IN (
  SELECT id FROM independent_affiliate_links 
  WHERE LOWER(platform_name) LIKE '%nobull%' 
     OR LOWER(original_affiliate_url) LIKE '%nobull%'
);

-- Then delete NoBull affiliate links
DELETE FROM independent_affiliate_links 
WHERE LOWER(platform_name) LIKE '%nobull%' 
   OR LOWER(original_affiliate_url) LIKE '%nobull%';