-- Add foreign key relationship between withdrawal_requests and profiles
ALTER TABLE public.withdrawal_requests 
ADD CONSTRAINT fk_withdrawal_requests_user_id 
FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) 
ON DELETE CASCADE;