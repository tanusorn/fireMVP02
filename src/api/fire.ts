// Fire Simulation API - FastAPI integration
import { FireSimulationRequest, FireSimulationResponse } from "@/types/api";
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

// Simulate fire spread
export async function simulateFire(
  request: FireSimulationRequest
): Promise<FireSimulationResponse> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/fire/fire/simulate`, {
    method: "POST",
    headers,
    body: JSON.stringify(request),
  });
  
  if (!response.ok) {
    throw new Error(`Fire simulation failed: ${response.statusText}`);
  }
  
  return response.json();
}

// Export for use with API base URL
export { API_BASE_URL };
