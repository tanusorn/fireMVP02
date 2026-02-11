// --- import เดิมทั้งหมด ---
import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import MainLayout from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Calculator,
  Loader2,
  Users,
  Check,
  X,
  Package,
  ArrowLeft,
  Plus,
} from "lucide-react";
import { runOptimization } from "@/api/math";
import { ZoneType } from "@/types/api";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useOperationCenters } from "@/hooks/useOperationCenters";
import { useAuth } from "@/contexts/AuthContext";
import { createIncident, calculateSeverity } from "@/api/incidentsDb";

export default function ResourceAllocation() {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { centers: operationCenters } = useOperationCenters();
  const state = location.state as any;

  const [selectedCenter, setSelectedCenter] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    if (!state) navigate("/fire-simulation");
  }, [state, navigate]);

  // ===============================
  // ✅ FIXED: Optimize Handler
  // ===============================
  const handleOptimize = async () => {
    if (!state) return;

    setIsOptimizing(true);
    try {
      const payload = {
        zones: {
          [state.zone]: state.firebreakArea,
        },
      };

      console.log("=== Math API Payload ===");
      console.log(payload);
      console.log("=======================");

      const response = await runOptimization(payload);

      console.log("=== Math API Response ===");
      console.log(response);
      console.log("========================");

      setResult(response.result);

      toast({
        title: "Optimization complete",
        description: "คำนวณแผนเรียบร้อย",
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Optimization failed",
        variant: "destructive",
      });
    } finally {
      setIsOptimizing(false);
    }
  };

  if (!state) return null;

  return (
    <MainLayout>
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>Zone {state.zone}</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Firebreak Area: {state.firebreakArea.toLocaleString()} m²</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Select Operation Center</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedCenter} onValueChange={setSelectedCenter}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Select center" />
              </SelectTrigger>
              <SelectContent>
                {operationCenters.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Button
          onClick={handleOptimize}
          disabled={isOptimizing}
          className="w-full h-14"
        >
          {isOptimizing ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Optimizing...
            </>
          ) : (
            <>
              <Calculator className="mr-2 h-5 w-5" />
              Run Optimization
            </>
          )}
        </Button>

        {/* ================= RESULTS ================= */}
        {result && (
          <Card>
            <CardHeader>
              <CardTitle>Optimization Result</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-muted p-4 rounded text-sm">
                {JSON.stringify(result, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}
