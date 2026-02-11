// Incidents API - Database operations with Supabase
import { supabase } from "@/integrations/supabase/client";
import { Json } from "@/integrations/supabase/types";

export interface IncidentDbRecord {
  id?: string;
  zone: string;
  lat: number;
  lon: number;
  severity: "high" | "medium" | "low";
  status: "active" | "contained" | "resolved";
  fire_status: "burning" | "contained" | "extinguished";
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
    lat: number;
    lon: number;
    temperature?: number;
    humidity?: number;
    wind_speed?: number;
    wind_direction?: number;
  };
  wind_info: {
    speed_mps: number;
    direction_deg: number;
  };
  simulation_params: Json;
  optimization_result?: Json;
  status_history: Json;
  report_id?: string;
  report_code?: string;
  created_by: string;
  created_at?: string;
  updated_at?: string;
}

// Determine severity based on burn percentage and ROS
export function calculateSeverity(
  burnPercentage: number,
  rosMax: number
): "high" | "medium" | "low" {
  if (burnPercentage > 30 || rosMax > 2) return "high";
  if (burnPercentage > 15 || rosMax > 1) return "medium";
  return "low";
}

// Create incident from simulation and optimization results
export async function createIncident(
  data: Omit<IncidentDbRecord, "id" | "created_at" | "updated_at">
): Promise<IncidentDbRecord | null> {
  const { data: incident, error } = await supabase
    .from("incidents")
    .insert([{
      zone: data.zone,
      lat: data.lat,
      lon: data.lon,
      severity: data.severity,
      status: data.status,
      fire_status: data.fire_status,
      cell_status: data.cell_status as Json,
      ros_statistics: data.ros_statistics as Json,
      starting_point: data.starting_point as Json,
      wind_info: data.wind_info as Json,
      simulation_params: data.simulation_params,
      optimization_result: data.optimization_result,
      status_history: data.status_history,
      report_id: data.report_id,
      report_code: data.report_code,
      created_by: data.created_by,
    }])
    .select()
    .single();

  if (error) {
    console.error("Error creating incident:", error);
    throw error;
  }

  return incident as unknown as IncidentDbRecord;
}

// Get all incidents for current user
export async function getIncidentsFromDb(): Promise<IncidentDbRecord[]> {
  const { data, error } = await supabase
    .from("incidents")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching incidents:", error);
    throw error;
  }

  return (data || []) as IncidentDbRecord[];
}

// Get incident by ID
export async function getIncidentByIdFromDb(id: string): Promise<IncidentDbRecord | null> {
  const { data, error } = await supabase
    .from("incidents")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("Error fetching incident:", error);
    throw error;
  }

  return data as IncidentDbRecord | null;
}

// Update incident status
export async function updateIncidentStatusInDb(
  id: string,
  fireStatus: "burning" | "contained" | "extinguished",
  updatedBy: string
): Promise<IncidentDbRecord | null> {
  // First get current incident to append to status history
  const { data: current } = await supabase
    .from("incidents")
    .select("status_history")
    .eq("id", id)
    .single();

  const currentHistory = (current?.status_history as Array<{ status: string; updated_by: string; updated_at: string }>) || [];
  const newHistory = [
    ...currentHistory,
    {
      status: fireStatus,
      updated_by: updatedBy,
      updated_at: new Date().toISOString(),
    },
  ];

  // Determine new status based on fire_status
  let newStatus: "active" | "contained" | "resolved" = "active";
  if (fireStatus === "contained") newStatus = "contained";
  if (fireStatus === "extinguished") newStatus = "resolved";

  const { data, error } = await supabase
    .from("incidents")
    .update({
      fire_status: fireStatus,
      status: newStatus,
      status_history: newHistory,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating incident:", error);
    throw error;
  }

  return data as IncidentDbRecord;
}

// Get incident statistics for dashboard
export async function getIncidentStats(): Promise<{
  total: number;
  active: number;
  contained: number;
  resolved: number;
  burning: number;
  extinguished: number;
  high: number;
  medium: number;
  low: number;
}> {
  const { data, error } = await supabase
    .from("incidents")
    .select("status, fire_status, severity");

  if (error) {
    console.error("Error fetching stats:", error);
    throw error;
  }

  const incidents = data || [];
  
  return {
    total: incidents.length,
    active: incidents.filter(i => i.status === "active").length,
    contained: incidents.filter(i => i.status === "contained").length,
    resolved: incidents.filter(i => i.status === "resolved").length,
    burning: incidents.filter(i => i.fire_status === "burning").length,
    extinguished: incidents.filter(i => i.fire_status === "extinguished").length,
    high: incidents.filter(i => i.severity === "high").length,
    medium: incidents.filter(i => i.severity === "medium").length,
    low: incidents.filter(i => i.severity === "low").length,
  };
}
