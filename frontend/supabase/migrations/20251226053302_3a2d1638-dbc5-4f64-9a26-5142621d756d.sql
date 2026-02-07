-- =====================================================
-- SECURITY FIX: Profiles & Notifications Tables
-- =====================================================

-- 1. Create public_profiles table for publicly viewable data
CREATE TABLE public.public_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  avatar_url text,
  operation_center operation_center NOT NULL DEFAULT 'K1',
  current_status user_status NOT NULL DEFAULT 'available',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on public_profiles
ALTER TABLE public.public_profiles ENABLE ROW LEVEL SECURITY;

-- Anyone can view public profiles
CREATE POLICY "Anyone can view public profiles"
ON public.public_profiles
FOR SELECT
USING (true);

-- Users can update their own public profile
CREATE POLICY "Users can update own public profile"
ON public.public_profiles
FOR UPDATE
USING (auth.uid() = id);

-- Users can insert their own public profile
CREATE POLICY "Users can insert own public profile"
ON public.public_profiles
FOR INSERT
WITH CHECK (auth.uid() = id);

-- 2. Copy existing data to public_profiles (without email)
INSERT INTO public.public_profiles (id, name, avatar_url, operation_center, current_status, created_at, updated_at)
SELECT id, name, avatar_url, operation_center, current_status, created_at, updated_at
FROM public.profiles;

-- 3. Update profiles table - make it private
-- Drop the existing public SELECT policy
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Create new private SELECT policy - users can only see their own
CREATE POLICY "Users can view own profile only"
ON public.profiles
FOR SELECT
USING (auth.uid() = id);

-- 4. Fix notifications INSERT policy
-- Drop the insecure INSERT policy
DROP POLICY IF EXISTS "Users can insert notifications" ON public.notifications;

-- Create secure INSERT policy requiring sender_id = auth.uid()
CREATE POLICY "Users can only insert notifications as themselves"
ON public.notifications
FOR INSERT
WITH CHECK (sender_id = auth.uid());

-- 5. Update handle_new_user function to also create public_profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Insert into private profiles table
  INSERT INTO public.profiles (id, name, email, operation_center)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'name', 'New User'),
    NEW.email,
    COALESCE((NEW.raw_user_meta_data ->> 'operation_center')::operation_center, 'K1')
  );
  
  -- Insert into public profiles table (no email)
  INSERT INTO public.public_profiles (id, name, operation_center)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'name', 'New User'),
    COALESCE((NEW.raw_user_meta_data ->> 'operation_center')::operation_center, 'K1')
  );
  
  RETURN NEW;
END;
$$;

-- 6. Add trigger to sync public_profiles when profiles is updated
CREATE OR REPLACE FUNCTION public.sync_public_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE public.public_profiles
  SET 
    name = NEW.name,
    avatar_url = NEW.avatar_url,
    operation_center = NEW.operation_center,
    current_status = NEW.current_status,
    updated_at = NEW.updated_at
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER sync_public_profile_on_update
AFTER UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.sync_public_profile();