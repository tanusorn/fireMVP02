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
import { OptimizationResult, ZoneType, ResourceCenter } from "@/types/api";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useOperationCenters } from "@/hooks/useOperationCenters";
import { useAuth } from "@/contexts/AuthContext";
import { createIncident, calculateSeverity } from "@/api/incidentsDb";
import OptimizationResultCard from "@/components/simulation/OptimizationResultCard";

interface LocationState {
  reportId: string;
  reportCode: string;
  reportName: string;
  zone: ZoneType;
  firebreakArea: number;
  burnedArea: number;
  lat?: number;
  lon?: number;
  simulationParams?: Record<string, unknown>;
  simulationResult: {
    wind_speed: number;
    wind_direction: number;
    summary: {
      unburned: { area_m2: number };
      burning: { area_m2: number };
      burned: { area_m2: number };
      firebreak: { area_m2: number };
    };
  };
}

interface EquipmentData {
  knife: number;
  rake: number;
  blower: number;
  torch: number;
}

interface StaffData {
  available: number;
  total: number;
}

export default function ResourceAllocation() {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { centers: operationCenters } = useOperationCenters();
  const state = location.state as LocationState | null;

  const [selectedCenter, setSelectedCenter] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [allocationSaved, setAllocationSaved] = useState(false);
  const [result, setResult] = useState<OptimizationResult | null>(null);
  const [equipment, setEquipment] = useState<EquipmentData>({
    knife: 0,
    rake: 0,
    blower: 0,
    torch: 0,
  });
  const [staffData, setStaffData] = useState<StaffData>({
    available: 0,
    total: 0,
  });

  useEffect(() => {
    if (!state) {
      toast({
        title: "No data",
        description: "Please start from fire simulation",
        variant: "destructive",
      });
      navigate("/fire-simulation");
    }
  }, [state, navigate, toast]);

  useEffect(() => {
    if (selectedCenter) {
      loadCenterData(selectedCenter);
    }
  }, [selectedCenter]);

  const loadCenterData = async (center: string) => {
    setIsLoading(true);
    try {
      const { data: equipmentData } = await supabase
        .from("equipment")
        .select("*")
        .eq("operation_center", center);

      const newEquipment: EquipmentData = {
        knife: 0,
        rake: 0,
        blower: 0,
        torch: 0,
      };
      equipmentData?.forEach((item) => {
        const type = item.equipment_type as keyof EquipmentData;
        if (["knife", "rake", "blower", "torch"].includes(type)) {
          newEquipment[type] = item.quantity;
        }
      });
      setEquipment(newEquipment);

      const { data: profiles } = await supabase
        .from("public_profiles")
        .select("id, current_status")
        .eq("operation_center", center);

      const total = profiles?.length || 0;
      const available =
        profiles?.filter((p) => p.current_status === "available").length || 0;
      setStaffData({ available, total });
    } catch (error) {
      console.error("Error loading center data:", error);
      toast({ title: "Failed to load center data", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOptimize = async () => {
    if (!state) return;

    setIsOptimizing(true);
    try {
      // 🔥 backend รับเฉพาะ zones
      const zones: Record<string, number> = {
        [state.zone]: state.firebreakArea, // ใช้ firebreak area
      };

      const response = await runOptimization(zones);

      setResult(response);
      toast({
        title: "Optimization complete",
        description: "Resource allocation calculated",
      });
    } catch (error) {
      console.error("Optimization error:", error);
      toast({
        title: "Optimization failed",
        description: "Unable to calculate resource allocation",
        variant: "destructive",
      });
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleSaveAllocation = async () => {
    if (!state || !result || !user?.id) return;

    setIsSaving(true);
    try {
      // Update report_zones with allocation result
      const allocationData = {
        operation_center: selectedCenter,
        staff_available: staffData.available,
        equipment: { ...equipment },
        optimization_result: result.result.zones,
      };

      const { error } = await supabase
        .from("report_zones")
        .update({
          allocation_result: JSON.parse(JSON.stringify(allocationData)),
        })
        .eq("report_id", state.reportId)
        .eq("zone_name", state.zone);

      if (error) throw error;

      // Create incident record
      const simResult = state.simulationResult;
      const totalArea =
        simResult.summary.unburned.area_m2 +
        simResult.summary.burning.area_m2 +
        simResult.summary.burned.area_m2 +
        simResult.summary.firebreak.area_m2;
      const burnPercentage =
        totalArea > 0
          ? ((simResult.summary.burned.area_m2 +
              simResult.summary.burning.area_m2) /
              totalArea) *
            100
          : 0;

      await createIncident({
        zone: state.zone,
        lat: state.lat || 0,
        lon: state.lon || 0,
        severity: calculateSeverity(burnPercentage, 1),
        status: "active",
        fire_status:
          simResult.summary.burning.area_m2 > 0 ? "burning" : "contained",
        cell_status: {
          unburned_area_m2: simResult.summary.unburned.area_m2,
          burning_area_m2: simResult.summary.burning.area_m2,
          burned_area_m2: simResult.summary.burned.area_m2,
          firebreak_area_m2: simResult.summary.firebreak.area_m2,
        },
        ros_statistics: { min: 0, max: 0, avg: 0 },
        starting_point: { lat: state.lat || 0, lon: state.lon || 0 },
        wind_info: {
          speed_mps: simResult.wind_speed,
          direction_deg: simResult.wind_direction,
        },
        simulation_params: JSON.parse(
          JSON.stringify(state.simulationParams || {}),
        ),
        optimization_result: JSON.parse(JSON.stringify(result)),
        status_history: [
          {
            status: "burning",
            updated_by: user.name || "System",
            updated_at: new Date().toISOString(),
          },
        ],
        report_id: state.reportId,
        report_code: state.reportCode,
        created_by: user.id,
      });

      setAllocationSaved(true);
      toast({
        title: "บันทึกสำเร็จ",
        description: `บันทึกการจัดสรรทรัพยากรและเหตุการณ์สำหรับ Zone ${state.zone}`,
      });
    } catch (error) {
      console.error("Save error:", error);
      toast({ title: "Failed to save allocation", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddZone = () => {
    if (!state) return;
    navigate("/fire-simulation", {
      state: {
        continueReport: true,
        reportId: state.reportId,
        reportCode: state.reportCode,
        reportName: state.reportName,
      },
    });
  };

  if (!state) return null;

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(-1)}
              className="mb-2"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <h1 className="text-xl sm:text-2xl font-bold">
              Resource Allocation
            </h1>
            <p className="text-sm text-muted-foreground">{state.reportName}</p>
          </div>
          <Badge variant="secondary" className="w-fit">
            {state.reportCode}
          </Badge>
        </div>

        {/* Zone Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Zone {state.zone} Data</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-xl font-bold text-info">
                  {state.firebreakArea.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">Firebreak m²</p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-xl font-bold text-destructive">
                  {state.burnedArea.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">Burned m²</p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-xl font-bold">
                  {state.simulationResult.wind_speed.toFixed(1)}
                </p>
                <p className="text-xs text-muted-foreground">Wind m/s</p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-xl font-bold">
                  {state.simulationResult.wind_direction.toFixed(0)}°
                </p>
                <p className="text-xs text-muted-foreground">Wind Dir</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Center Selection */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Select Operation Center</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Operation Center</Label>
              <Select
                value={selectedCenter}
                onValueChange={(v) => setSelectedCenter(v)}
              >
                <SelectTrigger className="w-full sm:w-64">
                  <SelectValue placeholder="Select center..." />
                </SelectTrigger>
                <SelectContent>
                  {operationCenters.map((center) => (
                    <SelectItem key={center.code} value={center.code}>
                      {center.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedCenter && !isLoading && (
              <div className="grid grid-cols-2 gap-4">
                <Card className="bg-muted/30">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Users className="h-8 w-8 text-primary" />
                      <div>
                        <p className="text-2xl font-bold">
                          {staffData.available} / {staffData.total}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Available Staff
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-muted/30">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Package className="h-8 w-8 text-warning" />
                      <div>
                        <p className="text-2xl font-bold">
                          {Object.values(equipment).reduce((a, b) => a + b, 0)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Total Equipment
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {selectedCenter && !isLoading && (
              <div className="grid grid-cols-4 gap-2">
                {(["knife", "rake", "blower", "torch"] as const).map((type) => (
                  <div
                    key={type}
                    className="text-center p-2 bg-muted/50 rounded-lg"
                  >
                    <p className="text-lg font-bold">{equipment[type]}</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {type}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {isLoading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Optimize Button */}
        <Button
          onClick={handleOptimize}
          className="w-full h-14 text-lg"
          disabled={!selectedCenter || isOptimizing || isLoading}
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

        {/* Results */}
        {result && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Optimization Results</h2>
            <div className="grid md:grid-cols-3 gap-4">
              {(["A", "B", "C"] as ZoneType[]).map((zone) => {
                const data = result.result.zones[zone];
                const isActive = data && data.do === 1;
                const isCurrentZone = zone === state.zone;
                return (
                  <Card
                    key={zone}
                    className={cn(
                      !isActive && "opacity-50",
                      isCurrentZone && "border-primary",
                    )}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xl font-bold">Zone {zone}</span>
                          {isActive ? (
                            <Check className="h-5 w-5 text-success" />
                          ) : (
                            <X className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex gap-1">
                          {isCurrentZone && <Badge>Current</Badge>}
                          <Badge variant={isActive ? "default" : "secondary"}>
                            {isActive ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                      </div>
                      {data && (
                        <div className="grid grid-cols-3 gap-4 text-center">
                          <div>
                            <p className="text-2xl font-bold text-info">
                              {data.teams}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Teams
                            </p>
                          </div>
                          <div>
                            <p className="text-2xl font-bold text-warning">
                              {data.time.toFixed(0)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Minutes
                            </p>
                          </div>
                          <div>
                            <p className="text-2xl font-bold text-destructive">
                              {data.unfinished_area.toLocaleString()}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Unfinished
                            </p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <Card className="bg-primary/10 border-primary/30">
              <CardContent className="p-4 flex items-center gap-4">
                <Users className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold">
                    {Object.values(result.result.zones).reduce(
                      (sum, z) => sum + (z?.teams || 0),
                      0,
                    )}{" "}
                    Teams
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Total deployed across all zones
                  </p>
                </div>
              </CardContent>
            </Card>

            {!allocationSaved ? (
              <Button
                onClick={handleSaveAllocation}
                className="w-full h-12"
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Save Allocation
                  </>
                )}
              </Button>
            ) : (
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={handleAddZone}
                  variant="outline"
                  className="flex-1"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Another Zone
                </Button>
                <Button
                  onClick={() => navigate("/fire-simulation")}
                  className="flex-1"
                >
                  <Check className="mr-2 h-4 w-4" />
                  Done
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
