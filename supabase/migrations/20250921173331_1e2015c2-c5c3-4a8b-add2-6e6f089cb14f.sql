-- Add wallet address to profiles table
ALTER TABLE public.profiles 
ADD COLUMN wallet_address TEXT UNIQUE,
ADD COLUMN wallet_connected_at TIMESTAMP WITH TIME ZONE;