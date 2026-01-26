// Math Optimization API - FastAPI integration
import { OptimizationResult, ResourceCenter } from "@/types/api";
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

// Run resource optimization
export async function runOptimization(
  centers?: ResourceCenter[]
): Promise<OptimizationResult> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/math/optimize`, {
    method: "POST",
    headers,
    body: centers ? JSON.stringify({ centers }) : undefined,
  });
  
  if (!response.ok) {
    throw new Error(`Optimization failed: ${response.statusText}`);
  }
  
  return response.json();
}
