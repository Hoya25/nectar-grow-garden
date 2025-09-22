-- Update Member Status Program to focus on 360LOCK amounts
-- Clear existing status levels and create new 360LOCK-based tiers

-- Delete existing status levels
DELETE FROM opportunity_status_levels;

-- Insert new 360LOCK-based Member Status tiers
INSERT INTO opportunity_status_levels (
  status_name,
  description,
  min_locked_nctr,
  min_lock_duration,
  reward_multiplier,
  benefits
) VALUES 
(
  'starter',
  'Welcome to the NCTR Alliance! Start your journey with basic earning opportunities.',
  0,
  0,
  1.0,
  ARRAY[
    'Basic earning opportunities',
    'Standard rewards',
    '90LOCK available',
    'Community access',
    'Welcome bonus eligibility'
  ]
),
(
  'bronze',
  'Bronze Member with 1000+ NCTR in 360LOCK. Enhanced earning potential unlocked.',
  1000,
  360,
  1.10,
  ARRAY[
    '10% earning multiplier',
    'Priority brand partnerships',
    'Enhanced reward rates',
    'Bronze member perks',
    'Exclusive Bronze opportunities'
  ]
),
(
  'silver',
  'Silver Member with 2500+ NCTR in 360LOCK. Significant earning boost and premium access.',
  2500,
  360,
  1.25,
  ARRAY[
    '25% earning multiplier',
    'Premium brand partnerships',
    'Silver member rewards',
    'Advanced earning opportunities',
    'Priority customer support',
    'Exclusive campaigns access'
  ]
),
(
  'gold',
  'Gold Member with 5000+ NCTR in 360LOCK. Elite earning opportunities and VIP treatment.',
  5000,
  360,
  1.40,
  ARRAY[
    '40% earning multiplier',
    'Elite brand partnerships',
    'Gold member exclusive deals',
    'VIP customer support',
    'Early access to new opportunities',
    'Gold member events'
  ]
),
(
  'platinum',
  'Platinum Member with 10000+ NCTR in 360LOCK. Maximum earning potential achieved.',
  10000,
  360,
  1.50,
  ARRAY[
    '50% earning multiplier',
    'Platinum exclusive partnerships',
    'Maximum reward rates',
    'Dedicated account manager',
    'Alpha product access',
    'Platinum member experiences',
    'Special event invitations'
  ]
),
(
  'diamond',
  'Diamond Elite with 25000+ NCTR in 360LOCK. The ultimate Alliance status with exclusive privileges.',
  25000,
  360,
  2.0,
  ARRAY[
    '100% earning multiplier',
    'Diamond exclusive partnerships',
    'Ultimate reward rates',
    'Personal relationship manager',
    'Beta product access',
    'Diamond member exclusives',
    'Private Alliance events',
    'Advisory council eligibility'
  ]
);