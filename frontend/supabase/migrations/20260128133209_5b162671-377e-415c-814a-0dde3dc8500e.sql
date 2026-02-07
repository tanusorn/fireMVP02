-- Add travel_time_min column to operation_centers
-- This allows each center to have its own travel time instead of hardcoded 30 minutes
ALTER TABLE public.operation_centers
ADD COLUMN IF NOT EXISTS travel_time_min integer NOT NULL DEFAULT 30;

-- Add comment for documentation
COMMENT ON COLUMN public.operation_centers.travel_time_min IS 'Travel time in minutes from this center to incident zones';

-- Initialize with different travel times for existing centers (example values)
-- K1 = 30 min, K2 = 25 min, K3 = 35 min (can be adjusted by admin)
UPDATE public.operation_centers SET travel_time_min = 30 WHERE code = 'K1';
UPDATE public.operation_centers SET travel_time_min = 25 WHERE code = 'K2';
UPDATE public.operation_centers SET travel_time_min = 35 WHERE code = 'K3';