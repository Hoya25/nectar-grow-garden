-- Create Connect and Follow social media bonus opportunities
INSERT INTO public.earning_opportunities (
  title,
  description,
  opportunity_type,
  nctr_reward,
  partner_name,
  affiliate_link,
  is_active,
  default_lock_type,
  reward_distribution_type
) VALUES 
(
  'Follow Us on X (Twitter)',
  'Connect with The Garden on X for the latest updates, community insights, and NCTR earning tips. One-time bonus for new followers!',
  'bonus',
  75.00,
  'The Garden',
  'https://x.com/thegarden', -- Update this to your actual X handle
  true,
  '360LOCK',
  'auto_lock'
),
(
  'Follow Us on Instagram',
  'Follow The Garden on Instagram for behind-the-scenes content, community highlights, and visual updates on the NCTR ecosystem.',
  'bonus',
  75.00,
  'The Garden',
  'https://instagram.com/thegarden', -- Update this to your actual Instagram handle
  true,
  '360LOCK',
  'auto_lock'
),
(
  'Subscribe to Our Substack',
  'Subscribe to The Garden''s Substack newsletter for in-depth articles, market analysis, and exclusive insights into the future of decentralized rewards.',
  'bonus',
  100.00,
  'The Garden',
  'https://thegarden.substack.com', -- Update this to your actual Substack URL
  true,
  '360LOCK',
  'auto_lock'
);