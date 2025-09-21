-- Create user profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create NCTR portfolio table
CREATE TABLE public.nctr_portfolio (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  available_nctr DECIMAL(18,8) NOT NULL DEFAULT 0,
  pending_nctr DECIMAL(18,8) NOT NULL DEFAULT 0,
  total_earned DECIMAL(18,8) NOT NULL DEFAULT 0,
  opportunity_status TEXT NOT NULL DEFAULT 'starter',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS on nctr_portfolio
ALTER TABLE public.nctr_portfolio ENABLE ROW LEVEL SECURITY;

-- Create policies for nctr_portfolio
CREATE POLICY "Users can view their own portfolio" 
ON public.nctr_portfolio 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own portfolio" 
ON public.nctr_portfolio 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own portfolio" 
ON public.nctr_portfolio 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create lock commitments table
CREATE TABLE public.nctr_locks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lock_type TEXT NOT NULL CHECK (lock_type IN ('90LOCK', '360LOCK')),
  nctr_amount DECIMAL(18,8) NOT NULL,
  lock_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  unlock_date TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'withdrawn')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on nctr_locks
ALTER TABLE public.nctr_locks ENABLE ROW LEVEL SECURITY;

-- Create policies for nctr_locks
CREATE POLICY "Users can view their own locks" 
ON public.nctr_locks 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own locks" 
ON public.nctr_locks 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create earning opportunities table
CREATE TABLE public.earning_opportunities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  opportunity_type TEXT NOT NULL CHECK (opportunity_type IN ('invite', 'shopping', 'partner', 'bonus')),
  nctr_reward DECIMAL(18,8),
  reward_per_dollar DECIMAL(6,4),
  partner_name TEXT,
  partner_logo_url TEXT,
  affiliate_link TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on earning_opportunities  
ALTER TABLE public.earning_opportunities ENABLE ROW LEVEL SECURITY;

-- Create policy for earning opportunities (public read)
CREATE POLICY "Anyone can view active opportunities" 
ON public.earning_opportunities 
FOR SELECT 
USING (is_active = true);

-- Create NCTR transactions table
CREATE TABLE public.nctr_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  opportunity_id UUID REFERENCES public.earning_opportunities(id),
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('earned', 'locked', 'unlocked', 'spent')),
  nctr_amount DECIMAL(18,8) NOT NULL,
  description TEXT,
  purchase_amount DECIMAL(10,2),
  partner_name TEXT,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on nctr_transactions
ALTER TABLE public.nctr_transactions ENABLE ROW LEVEL SECURITY;

-- Create policies for nctr_transactions
CREATE POLICY "Users can view their own transactions" 
ON public.nctr_transactions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own transactions" 
ON public.nctr_transactions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_nctr_portfolio_updated_at
  BEFORE UPDATE ON public.nctr_portfolio
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_earning_opportunities_updated_at
  BEFORE UPDATE ON public.earning_opportunities
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (
    NEW.id, 
    NEW.email,
    NEW.raw_user_meta_data ->> 'full_name'
  );
  
  INSERT INTO public.nctr_portfolio (user_id)
  VALUES (NEW.id);
  
  RETURN NEW;
END;
$$;

-- Create trigger to automatically create profile and portfolio on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();