-- Step 1: Drop the RLS policy that depends on equipment.operation_center
DROP POLICY IF EXISTS "Users can manage their center equipment" ON public.equipment;

-- Step 2: Add unique constraint on operation_centers.code if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'operation_centers_code_key'
      AND conrelid = 'public.operation_centers'::regclass
  ) THEN
    ALTER TABLE public.operation_centers
      ADD CONSTRAINT operation_centers_code_key UNIQUE (code);
  END IF;
END $$;

-- Step 3: Convert enum columns to TEXT
ALTER TABLE public.profiles
  ALTER COLUMN operation_center TYPE text USING operation_center::text;

ALTER TABLE public.public_profiles
  ALTER COLUMN operation_center TYPE text USING operation_center::text;

ALTER TABLE public.equipment
  ALTER COLUMN operation_center TYPE text USING operation_center::text;

-- Step 4: Re-apply defaults
ALTER TABLE public.profiles
  ALTER COLUMN operation_center SET DEFAULT 'K1';

ALTER TABLE public.public_profiles
  ALTER COLUMN operation_center SET DEFAULT 'K1';

-- Step 5: Add foreign keys
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_operation_center_fkey'
      AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_operation_center_fkey
      FOREIGN KEY (operation_center)
      REFERENCES public.operation_centers(code)
      ON UPDATE CASCADE ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'public_profiles_operation_center_fkey'
      AND conrelid = 'public.public_profiles'::regclass
  ) THEN
    ALTER TABLE public.public_profiles
      ADD CONSTRAINT public_profiles_operation_center_fkey
      FOREIGN KEY (operation_center)
      REFERENCES public.operation_centers(code)
      ON UPDATE CASCADE ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'equipment_operation_center_fkey'
      AND conrelid = 'public.equipment'::regclass
  ) THEN
    ALTER TABLE public.equipment
      ADD CONSTRAINT equipment_operation_center_fkey
      FOREIGN KEY (operation_center)
      REFERENCES public.operation_centers(code)
      ON UPDATE CASCADE ON DELETE RESTRICT;
  END IF;
END $$;

-- Step 6: Recreate the RLS policy on equipment (now using text comparison)
CREATE POLICY "Users can manage their center equipment"
ON public.equipment
FOR ALL
USING (
  operation_center = (
    SELECT profiles.operation_center
    FROM profiles
    WHERE profiles.id = auth.uid()
  )
);

-- Step 7: Update database functions to remove enum casting
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, name, email, operation_center)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'name', 'New User'),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'operation_center', 'K1')
  );

  INSERT INTO public.public_profiles (id, name, operation_center)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'name', 'New User'),
    COALESCE(NEW.raw_user_meta_data ->> 'operation_center', 'K1')
  );

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sync_public_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
$function$;

-- Step 8: Drop the old enum type
DROP TYPE IF EXISTS public.operation_center;