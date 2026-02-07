// API Types for FastAPI Backend Integration

// Fire Simulation
export interface FireSimulationRequest {
  lat: number;
  lon: number;
  year: number;
  month: number;
  day: number;
  grid_x: number;
  grid_y: number;
  cell_size: number;
  sim_minutes: number;
}

export interface FireSimulationResponse {
  wind_speed: number;
  wind_direction: number;
  summary: {
    unburned: { area_m2: number };
    burning: { area_m2: number };
    burned: { area_m2: number };
    firebreak: { area_m2: number };
  };
}

// Zone Management
export type ZoneType = "A" | "B" | "C";

export interface ZoneSaveRequest {
  zone: string;
  area: number;
}

export interface ZoneSaveResponse {
  message: string;
  zones: Record<string, number>;
}

// Resource Allocation
export interface ResourceCenter {
  id: string;
  name: string;
  staff_count: number;
  travel_time_min: number;
  equipment: {
    knife: number;
    rake: number;
    blower: number;
    torch: number;
  };
}

export interface OptimizationResult {
  status: "success" | "error";
  result: {
    zones: {
      [key in ZoneType]?: {
        do: number;
        teams: number;
        time: number;
        unfinished_area: number;
      };
    };
  };
}

// Incident Management
export type SeverityLevel = "high" | "medium" | "low";
export type FireStatus = "burning" | "extinguished";

export interface StatusUpdate {
  id: string;
  status: FireStatus;
  updated_by: string;
  updated_at: string;
}

export interface Incident {
  id: string;
  zone: ZoneType;
  lat: number;
  lon: number;
  created_at: string;
  severity: SeverityLevel;
  slope_percent: number;
  slope_degrees: number;
  ndvi: number;
  cell_status: {
    unburned_area_m2: number;
    burning_area_m2: number;
    burned_area_m2: number;
    firebreak_area_m2: number;
  };
  ros_statistics: {
    min: number;
    max: number;
    avg: number;
  };
  starting_point: {
    temperature: number;
    humidity: number;
    wind_speed: number;
    wind_direction: number;
  };
  status: "active" | "contained" | "resolved";
  fire_status: FireStatus;
  status_history: StatusUpdate[];
}

// Authentication
export interface User {
  id: string;
  email: string;
  name: string;
  department: string;
  role: "admin" | "officer" | "pending";
  created_at: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  department: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

// Notifications
export interface Notification {
  id: string;
  title: string;
  message: string;
  type: "alert" | "info" | "warning";
  read: boolean;
  created_at: string;
}
