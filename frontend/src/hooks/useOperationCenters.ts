import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface OperationCenterOption {
  code: string;
  name: string;
}

export function useOperationCenters() {
  const [centers, setCenters] = useState<OperationCenterOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCenters();
  }, []);

  const fetchCenters = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("operation_centers")
        .select("code, name")
        .order("code");

      if (error) throw error;

      setCenters(data || []);
    } catch (err) {
      console.error("Error fetching operation centers:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch operation centers");
      // No fallback - centers must come from database
      setCenters([]);
    } finally {
      setIsLoading(false);
    }
  };

  return { centers, isLoading, error, refetch: fetchCenters };
}
