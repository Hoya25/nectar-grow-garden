-- Add RLS policies for admins to manage earning opportunities
CREATE POLICY "Admins can insert opportunities" 
ON public.earning_opportunities 
FOR INSERT 
WITH CHECK (check_user_is_admin(auth.uid()));

CREATE POLICY "Admins can update opportunities" 
ON public.earning_opportunities 
FOR UPDATE 
USING (check_user_is_admin(auth.uid()));

CREATE POLICY "Admins can delete opportunities" 
ON public.earning_opportunities 
FOR DELETE 
USING (check_user_is_admin(auth.uid()));