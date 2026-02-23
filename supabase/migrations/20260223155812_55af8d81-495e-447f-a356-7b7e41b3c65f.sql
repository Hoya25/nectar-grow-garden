ALTER TABLE public.unified_profiles ADD COLUMN handle text UNIQUE;

-- Index for fast lookups
CREATE INDEX idx_unified_profiles_handle ON public.unified_profiles(handle) WHERE handle IS NOT NULL;