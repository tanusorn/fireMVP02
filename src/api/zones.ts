// Zone Management API - FastAPI integration
import { ZoneSaveRequest, ZoneSaveResponse, ZoneType } from "@/types/api";
import { supabase } from "@/integrations/supabase/client";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

// Get auth headers with session token
async function getAuthHeaders(): Promise<HeadersInit> {
  const { data: { session } } = await supabase.auth.getSession();
  return {
    "Content-Type": "application/json",
    ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
  };
}

// Save zone firebreak area
export async function saveZone(
  request: ZoneSaveRequest
): Promise<ZoneSaveResponse> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/zone/zone/save`, {
    method: "POST",
    headers,
    body: JSON.stringify(request),
  });
  
  if (!response.ok) {
    throw new Error(`Failed to save zone: ${response.statusText}`);
  }
  
  return response.json();
}

// Clear all zones
export async function clearZones(): Promise<ZoneSaveResponse> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/zone/zone/clear`, {
    method: "POST",
    headers,
  });
  
  if (!response.ok) {
    throw new Error(`Failed to clear zones: ${response.statusText}`);
  }
  
  return response.json();
}

// Get saved zones (helper for UI state)
export interface SavedZone {
  zone: ZoneType;
  area: number;
  savedAt: string;
}

let savedZonesStore: SavedZone[] = [];

export function getSavedZones(): SavedZone[] {
  return savedZonesStore;
}

export function addSavedZone(zone: ZoneType, area: number): void {
  const existing = savedZonesStore.findIndex((z) => z.zone === zone);
  if (existing >= 0) {
    savedZonesStore[existing] = { zone, area, savedAt: new Date().toISOString() };
  } else {
    savedZonesStore.push({ zone, area, savedAt: new Date().toISOString() });
  }
}

export function clearSavedZonesStore(): void {
  savedZonesStore = [];
}
