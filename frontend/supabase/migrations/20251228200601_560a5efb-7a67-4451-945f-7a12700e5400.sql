-- Create enum for roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own roles
CREATE POLICY "Users can view own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Policy: Only admins can manage roles (using security definer function below)
CREATE POLICY "Admins can manage all roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
  )
);

-- Create security definer function to check roles (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Add new columns to operation_centers table
ALTER TABLE public.operation_centers
ADD COLUMN IF NOT EXISTS location text,
ADD COLUMN IF NOT EXISTS latitude double precision,
ADD COLUMN IF NOT EXISTS longitude double precision,
ADD COLUMN IF NOT EXISTS description text,
ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now(),
ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);

-- Drop existing SELECT policy
DROP POLICY IF EXISTS "Anyone can read operation centers" ON public.operation_centers;

-- Create new RLS policies for operation_centers
-- Allow SELECT for all authenticated users
CREATE POLICY "Authenticated users can view operation centers"
ON public.operation_centers
FOR SELECT
TO authenticated
USING (true);

-- Allow INSERT only for admins
CREATE POLICY "Admins can create operation centers"
ON public.operation_centers
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Allow UPDATE only for admins
CREATE POLICY "Admins can update operation centers"
ON public.operation_centers
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Allow DELETE only for admins
CREATE POLICY "Admins can delete operation centers"
ON public.operation_centers
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));