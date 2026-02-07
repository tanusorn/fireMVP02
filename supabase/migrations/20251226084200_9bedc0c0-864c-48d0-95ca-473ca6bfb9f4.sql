-- Fix report_zones RLS: Replace overly permissive ALL policy with creator-based access

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Authenticated users can manage zones" ON report_zones;

-- Create INSERT policy: Only report creators can add zones to their reports
CREATE POLICY "Report creators can insert zones" ON report_zones
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM fire_reports 
    WHERE id = report_id AND created_by = auth.uid()
  ));

-- Create UPDATE policy: Only report creators can update their zones
CREATE POLICY "Report creators can update zones" ON report_zones
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM fire_reports 
    WHERE id = report_id AND created_by = auth.uid()
  ));

-- Create DELETE policy: Only report creators can delete their zones
CREATE POLICY "Report creators can delete zones" ON report_zones
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM fire_reports 
    WHERE id = report_id AND created_by = auth.uid()
  ));