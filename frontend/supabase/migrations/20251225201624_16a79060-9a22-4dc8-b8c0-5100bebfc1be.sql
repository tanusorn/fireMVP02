-- Create operation center enum
CREATE TYPE public.operation_center AS ENUM ('K1', 'K2', 'K3');

-- Create user status enum
CREATE TYPE public.user_status AS ENUM ('available', 'unavailable');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  operation_center operation_center NOT NULL DEFAULT 'K1',
  avatar_url TEXT,
  current_status user_status NOT NULL DEFAULT 'available',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Create equipment table
CREATE TABLE public.equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_center operation_center NOT NULL,
  equipment_type TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(operation_center, equipment_type)
);

-- Enable RLS on equipment
ALTER TABLE public.equipment ENABLE ROW LEVEL SECURITY;

-- Equipment policies
CREATE POLICY "Anyone can view equipment"
  ON public.equipment FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage their center equipment"
  ON public.equipment FOR ALL
  TO authenticated
  USING (
    operation_center = (SELECT operation_center FROM public.profiles WHERE id = auth.uid())
  );

-- Create fire reports table
CREATE TABLE public.fire_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_code TEXT NOT NULL UNIQUE,
  report_name TEXT,
  created_by UUID REFERENCES auth.users(id),
  lat DOUBLE PRECISION NOT NULL,
  lon DOUBLE PRECISION NOT NULL,
  simulation_params JSONB,
  simulation_result JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on fire_reports
ALTER TABLE public.fire_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view fire reports"
  ON public.fire_reports FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create fire reports"
  ON public.fire_reports FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Creators can update their reports"
  ON public.fire_reports FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by);

-- Create report zones table
CREATE TABLE public.report_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID REFERENCES public.fire_reports(id) ON DELETE CASCADE,
  zone_name TEXT NOT NULL,
  firebreak_area_m2 DOUBLE PRECISION NOT NULL,
  allocation_result JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(report_id, zone_name)
);

-- Enable RLS on report_zones
ALTER TABLE public.report_zones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view report zones"
  ON public.report_zones FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage zones"
  ON public.report_zones FOR ALL
  TO authenticated
  USING (true);

-- Create daily status history table
CREATE TABLE public.daily_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  status user_status NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- Enable RLS on daily_status_history
ALTER TABLE public.daily_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all status history"
  ON public.daily_status_history FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage own status"
  ON public.daily_status_history FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);

-- Create notifications table
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  report_id UUID REFERENCES public.fire_reports(id),
  sender_id UUID REFERENCES auth.users(id),
  read BOOLEAN NOT NULL DEFAULT false,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert notifications"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Function to handle new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, operation_center)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'name', 'New User'),
    NEW.email,
    COALESCE((NEW.raw_user_meta_data ->> 'operation_center')::operation_center, 'K1')
  );
  RETURN NEW;
END;
$$;

-- Trigger for new user
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_equipment_updated_at
  BEFORE UPDATE ON public.equipment
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_fire_reports_updated_at
  BEFORE UPDATE ON public.fire_reports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default equipment for each center
INSERT INTO public.equipment (operation_center, equipment_type, quantity) VALUES
  ('K1', 'knife', 10),
  ('K1', 'rake', 8),
  ('K1', 'blower', 5),
  ('K1', 'torch', 3),
  ('K2', 'knife', 12),
  ('K2', 'rake', 10),
  ('K2', 'blower', 6),
  ('K2', 'torch', 4),
  ('K3', 'knife', 8),
  ('K3', 'rake', 6),
  ('K3', 'blower', 4),
  ('K3', 'torch', 2);