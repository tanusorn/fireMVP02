-- Create operation_centers lookup table
CREATE TABLE IF NOT EXISTS public.operation_centers (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.operation_centers ENABLE ROW LEVEL SECURITY;

-- Everyone can read operation centers
CREATE POLICY "Anyone can read operation centers"
  ON public.operation_centers
  FOR SELECT
  USING (true);

-- Insert default operation centers
INSERT INTO public.operation_centers (code, name) VALUES
  ('K1', 'Operation Center K1'),
  ('K2', 'Operation Center K2'),
  ('K3', 'Operation Center K3')
ON CONFLICT (code) DO NOTHING;