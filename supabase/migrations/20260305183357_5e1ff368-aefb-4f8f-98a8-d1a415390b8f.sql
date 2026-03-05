CREATE TABLE IF NOT EXISTS public.mcp_rate_limit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address text NOT NULL,
  tool_name text NOT NULL,
  hit_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.mcp_rate_limit_log ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_mcp_rate_limit_log_ip_time ON public.mcp_rate_limit_log (ip_address, hit_at DESC);
CREATE INDEX idx_mcp_rate_limit_log_tool ON public.mcp_rate_limit_log (tool_name, hit_at DESC);