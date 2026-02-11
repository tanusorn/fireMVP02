// Math Optimization API - FastAPI integration
import { OptimizationResult } from "@/types/api";
import { supabase } from "@/integrations/supabase/client";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

/**
 * Payload ที่ Backend /math/optimize ต้องการ
 * ตรงกับ FastAPI:
 * class OptimizeRequest(BaseModel):
 *   zones: Dict[str, float]
 */
export interface OptimizeRequest {
  zones: Record<string, number>;
}

// Get auth headers with session token
async function getAuthHeaders(): Promise<HeadersInit> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return {
    "Content-Type": "application/json",
    ...(session?.access_token
      ? { Authorization: `Bearer ${session.access_token}` }
      : {}),
  };
}

// Run resource optimization (NEW VERSION)
export async function runOptimization(
  payload: OptimizeRequest,
): Promise<OptimizationResult> {
  const headers = await getAuthHeaders();

  const response = await fetch(`${API_BASE_URL}/math/optimize`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Optimization failed: ${response.status} ${text}`);
  }

  return response.json();
}
