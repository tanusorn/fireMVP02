import { supabase } from "@/integrations/supabase/client";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

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

export async function runOptimization(zones: Record<string, number>) {
  const headers = await getAuthHeaders();

  const response = await fetch(`${API_BASE_URL}/math/optimize`, {
    method: "POST",
    headers,
    body: JSON.stringify({ zones }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Optimization failed: ${err}`);
  }

  return response.json();
}
