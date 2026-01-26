-- Drop the problematic policy that causes infinite recursion
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;

-- Create a new policy using the has_role function to avoid recursion
CREATE POLICY "Admins can manage all roles" 
ON public.user_roles 
FOR ALL 
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));