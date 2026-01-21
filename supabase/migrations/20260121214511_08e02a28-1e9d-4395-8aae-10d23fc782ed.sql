-- Add Crescendo sync fields to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS crescendo_user_id TEXT,
ADD COLUMN IF NOT EXISTS crescendo_synced_at TIMESTAMP WITH TIME ZONE;

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_profiles_crescendo_user_id 
ON profiles(crescendo_user_id) WHERE crescendo_user_id IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN profiles.crescendo_user_id IS 'External user ID from Crescendo platform for cross-platform sync';
COMMENT ON COLUMN profiles.crescendo_synced_at IS 'Timestamp of last successful sync with Crescendo';