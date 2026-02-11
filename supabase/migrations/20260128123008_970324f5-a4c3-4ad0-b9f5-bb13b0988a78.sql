-- 1. Add staff_count column to operation_centers
ALTER TABLE public.operation_centers
ADD COLUMN IF NOT EXISTS staff_count integer NOT NULL DEFAULT 0;

-- 2. Create trigger function to update staff_count automatically
CREATE OR REPLACE FUNCTION public.update_operation_center_staff_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Handle INSERT: increment staff_count for the new operation_center
  IF TG_OP = 'INSERT' THEN
    UPDATE public.operation_centers
    SET staff_count = staff_count + 1
    WHERE code = NEW.operation_center;
    RETURN NEW;
  
  -- Handle UPDATE: if operation_center changed, decrement old and increment new
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.operation_center IS DISTINCT FROM NEW.operation_center THEN
      -- Decrement old center
      IF OLD.operation_center IS NOT NULL THEN
        UPDATE public.operation_centers
        SET staff_count = GREATEST(staff_count - 1, 0)
        WHERE code = OLD.operation_center;
      END IF;
      -- Increment new center
      IF NEW.operation_center IS NOT NULL THEN
        UPDATE public.operation_centers
        SET staff_count = staff_count + 1
        WHERE code = NEW.operation_center;
      END IF;
    END IF;
    RETURN NEW;
  
  -- Handle DELETE: decrement staff_count
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.operation_center IS NOT NULL THEN
      UPDATE public.operation_centers
      SET staff_count = GREATEST(staff_count - 1, 0)
      WHERE code = OLD.operation_center;
    END IF;
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$;

-- 3. Create trigger on profiles table
DROP TRIGGER IF EXISTS trigger_update_staff_count ON public.profiles;
CREATE TRIGGER trigger_update_staff_count
AFTER INSERT OR UPDATE OF operation_center OR DELETE
ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_operation_center_staff_count();

-- 4. Initialize staff_count based on existing profiles
UPDATE public.operation_centers oc
SET staff_count = (
  SELECT COUNT(*)
  FROM public.profiles p
  WHERE p.operation_center = oc.code
);