-- Create incidents table for storing fire simulation and optimization results
CREATE TABLE public.incidents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  zone TEXT NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lon DOUBLE PRECISION NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('high', 'medium', 'low')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'contained', 'resolved')),
  fire_status TEXT NOT NULL DEFAULT 'burning' CHECK (fire_status IN ('burning', 'contained', 'extinguished')),
  
  -- Simulation data
  cell_status JSONB NOT NULL DEFAULT '{}',
  ros_statistics JSONB NOT NULL DEFAULT '{}',
  starting_point JSONB NOT NULL DEFAULT '{}',
  wind_info JSONB NOT NULL DEFAULT '{}',
  simulation_params JSONB NOT NULL DEFAULT '{}',
  
  -- Optimization data
  optimization_result JSONB,
  
  -- Status history
  status_history JSONB NOT NULL DEFAULT '[]',
  
  -- Report reference
  report_id UUID REFERENCES public.fire_reports(id),
  report_code TEXT,
  
  -- Audit
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own incidents" 
ON public.incidents 
FOR SELECT 
USING (auth.uid() = created_by);

CREATE POLICY "Users can create their own incidents" 
ON public.incidents 
FOR INSERT 
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own incidents" 
ON public.incidents 
FOR UPDATE 
USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own incidents" 
ON public.incidents 
FOR DELETE 
USING (auth.uid() = created_by);

-- Create index for better query performance
CREATE INDEX idx_incidents_created_by ON public.incidents(created_by);
CREATE INDEX idx_incidents_zone ON public.incidents(zone);
CREATE INDEX idx_incidents_status ON public.incidents(status);
CREATE INDEX idx_incidents_fire_status ON public.incidents(fire_status);
CREATE INDEX idx_incidents_created_at ON public.incidents(created_at DESC);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_incidents_updated_at
BEFORE UPDATE ON public.incidents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();