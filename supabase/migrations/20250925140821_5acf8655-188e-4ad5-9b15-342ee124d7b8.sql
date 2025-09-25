-- Enable real-time for earning_opportunities table
ALTER TABLE public.earning_opportunities REPLICA IDENTITY FULL;

-- Add the table to the realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.earning_opportunities;