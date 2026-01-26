-- Allow anonymous users to view operation centers (for registration page)
CREATE POLICY "Anyone can view operation centers" 
ON public.operation_centers 
FOR SELECT 
USING (true);