import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import MainLayout from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  ArrowLeft, 
  MapPin, 
  Calendar, 
  AlertTriangle, 
  Thermometer, 
  Wind, 
  Activity, 
  Flame, 
  CheckCircle, 
  User, 
  Clock, 
  Navigation,
  Shield,
  TreeDeciduous,
  Square,
  FileText
} from "lucide-react";
import { getIncidentByIdFromDb, updateIncidentStatusInDb, IncidentDbRecord } from "@/api/incidentsDb";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import SimulationResultCard from "@/components/simulation/SimulationResultCard";
import OptimizationResultCard from "@/components/simulation/OptimizationResultCard";

type FireStatus = "burning" | "contained" | "extinguished";

const severityColors: Record<string, string> = {
  high: "bg-destructive text-destructive-foreground",
  medium: "bg-warning text-warning-foreground",
  low: "bg-success text-success-foreground",
};

const statusColors: Record<string, string> = {
  active: "bg-destructive/20 text-destructive border-destructive/50",
  contained: "bg-warning/20 text-warning border-warning/50",
  resolved: "bg-success/20 text-success border-success/50",
};

const fireStatusColors: Record<FireStatus, string> = {
  burning: "bg-destructive text-destructive-foreground",
  contained: "bg-warning text-warning-foreground",
  extinguished: "bg-success text-success-foreground",
};

export default function IncidentDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [incident, setIncident] = useState<IncidentDbRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<FireStatus | "">("");

  useEffect(() => {
    if (id) {
      getIncidentByIdFromDb(id)
        .then((data) => {
          setIncident(data);
          if (data) {
            setSelectedStatus(data.fire_status as FireStatus);
          }
          setIsLoading(false);
        })
        .catch((error) => {
          console.error("Error loading incident:", error);
          setIsLoading(false);
        });
    }
  }, [id]);

  const handleStatusUpdate = async () => {
    if (!incident || !selectedStatus || selectedStatus === incident.fire_status) return;
    
    setIsUpdating(true);
    try {
      const updatedIncident = await updateIncidentStatusInDb(
        incident.id!,
        selectedStatus,
        user?.name || "Unknown Officer"
      );
      if (updatedIncident) {
        setIncident(updatedIncident);
        toast.success(`สถานะถูกเปลี่ยนเป็น ${selectedStatus.toUpperCase()}`);
      }
    } catch (error) {
      toast.error("ไม่สามารถอัปเดตสถานะได้");
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64" />
          <Skeleton className="h-48" />
        </div>
      </MainLayout>
    );
  }

  if (!incident) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <AlertTriangle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">ไม่พบเหตุการณ์</h2>
          <p className="text-muted-foreground mb-6">เหตุการณ์ที่ค้นหาไม่มีอยู่หรือคุณไม่มีสิทธิ์เข้าถึง</p>
          <Button asChild>
            <Link to="/incidents">
              <ArrowLeft className="h-4 w-4 mr-2" />
              กลับไปหน้ารายการ
            </Link>
          </Button>
        </div>
      </MainLayout>
    );
  }

  const cellStatus = incident.cell_status as {
    unburned_area_m2?: number;
    burning_area_m2?: number;
    burned_area_m2?: number;
    firebreak_area_m2?: number;
  } || {};

  const rosStats = incident.ros_statistics as {
    min?: number;
    max?: number;
    avg?: number;
  } || {};

  const windInfo = incident.wind_info as {
    speed_mps?: number;
    direction_deg?: number;
  } || {};

  const startingPoint = incident.starting_point as {
    lat?: number;
    lon?: number;
    temperature?: number;
    humidity?: number;
    wind_speed?: number;
    wind_direction?: number;
  } || {};

  const statusHistory = (incident.status_history as Array<{
    status: string;
    updated_by: string;
    updated_at: string;
  }>) || [];

  const simulationParams = incident.simulation_params as Record<string, unknown> || {};

  return (
    <MainLayout>
      <div className="space-y-6">
        <Button variant="ghost" asChild className="mb-4">
          <Link to="/incidents">
            <ArrowLeft className="h-4 w-4 mr-2" />
            กลับไปหน้ารายการ
          </Link>
        </Button>

        {/* Header Card */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-2xl flex items-center gap-2">
                  {incident.report_code && (
                    <Badge variant="outline" className="font-mono">
                      <FileText className="h-3 w-3 mr-1" />
                      {incident.report_code}
                    </Badge>
                  )}
                  Zone {incident.zone}
                </CardTitle>
                <p className="text-muted-foreground mt-1 flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  {incident.lat.toFixed(4)}, {incident.lon.toFixed(4)}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge className={severityColors[incident.severity]}>
                  {incident.severity === "high" ? "ความรุนแรงสูง" : incident.severity === "medium" ? "ปานกลาง" : "ต่ำ"}
                </Badge>
                <Badge variant="outline" className={statusColors[incident.status]}>
                  {incident.status === "active" ? "กำลังดำเนินการ" : incident.status === "contained" ? "ควบคุมได้" : "แก้ไขแล้ว"}
                </Badge>
                <Badge className={fireStatusColors[incident.fire_status as FireStatus]}>
                  {incident.fire_status === "burning" ? (
                    <><Flame className="h-3 w-3 mr-1" /> กำลังไหม้</>
                  ) : incident.fire_status === "contained" ? (
                    <><Shield className="h-3 w-3 mr-1" /> ควบคุมได้</>
                  ) : (
                    <><CheckCircle className="h-3 w-3 mr-1" /> ดับแล้ว</>
                  )}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Status Update Section */}
            <Card className="border-2 border-primary/30 bg-primary/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Flame className="h-5 w-5 text-primary" />
                  อัปเดตสถานะ
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Select value={selectedStatus} onValueChange={(v) => setSelectedStatus(v as FireStatus)}>
                    <SelectTrigger className="w-full sm:w-[200px]">
                      <SelectValue placeholder="เลือกสถานะ" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="burning">
                        <span className="flex items-center gap-2">
                          <Flame className="h-4 w-4 text-destructive" />
                          กำลังไหม้
                        </span>
                      </SelectItem>
                      <SelectItem value="contained">
                        <span className="flex items-center gap-2">
                          <Shield className="h-4 w-4 text-warning" />
                          ควบคุมได้
                        </span>
                      </SelectItem>
                      <SelectItem value="extinguished">
                        <span className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-success" />
                          ดับแล้ว
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <Button 
                    onClick={handleStatusUpdate} 
                    disabled={isUpdating || !selectedStatus || selectedStatus === incident.fire_status}
                    className="w-full sm:w-auto"
                  >
                    {isUpdating ? "กำลังอัปเดต..." : "อัปเดตสถานะ"}
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  อัปเดตโดย: {user?.name || "Unknown Officer"}
                </p>
              </CardContent>
            </Card>

            {/* Navigation Button */}
            <div className="flex justify-center">
              <Button
                asChild
                className="w-full sm:w-auto"
                size="lg"
              >
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${incident.lat},${incident.lon}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Navigation className="h-5 w-5 mr-2" />
                  นำทางไปยังเหตุการณ์
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Cell Status Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-success/10 border-success/30">
            <CardContent className="p-4 text-center">
              <TreeDeciduous className="h-8 w-8 mx-auto mb-2 text-success" />
              <p className="text-2xl font-bold text-success">{(cellStatus.unburned_area_m2 || 0).toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">ยังไม่ไหม้ (m²)</p>
            </CardContent>
          </Card>
          <Card className="bg-warning/10 border-warning/30">
            <CardContent className="p-4 text-center">
              <Flame className="h-8 w-8 mx-auto mb-2 text-warning" />
              <p className="text-2xl font-bold text-warning">{(cellStatus.burning_area_m2 || 0).toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">กำลังไหม้ (m²)</p>
            </CardContent>
          </Card>
          <Card className="bg-destructive/10 border-destructive/30">
            <CardContent className="p-4 text-center">
              <Square className="h-8 w-8 mx-auto mb-2 text-destructive" />
              <p className="text-2xl font-bold text-destructive">{(cellStatus.burned_area_m2 || 0).toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">ไหม้แล้ว (m²)</p>
            </CardContent>
          </Card>
          <Card className="bg-primary/10 border-primary/30">
            <CardContent className="p-4 text-center">
              <Shield className="h-8 w-8 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold text-primary">{(cellStatus.firebreak_area_m2 || 0).toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">แนวกันไฟ (m²)</p>
            </CardContent>
          </Card>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-muted/50">
            <CardContent className="p-4 flex items-center gap-3">
              <Calendar className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">รายงานเมื่อ</p>
                <p className="font-medium">
                  {incident.created_at && new Date(incident.created_at).toLocaleDateString("th-TH")}
                </p>
              </div>
            </CardContent>
          </Card>

          {startingPoint.temperature !== undefined && (
            <Card className="bg-muted/50">
              <CardContent className="p-4 flex items-center gap-3">
                <Thermometer className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">อุณหภูมิ</p>
                  <p className="font-medium">{startingPoint.temperature}°C</p>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="bg-muted/50">
            <CardContent className="p-4 flex items-center gap-3">
              <Wind className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">ลม</p>
                <p className="font-medium">
                  {windInfo.speed_mps?.toFixed(1) || 0} m/s @ {windInfo.direction_deg?.toFixed(0) || 0}°
                </p>
              </div>
            </CardContent>
          </Card>

          {(rosStats.avg !== undefined) && (
            <Card className="bg-muted/50">
              <CardContent className="p-4 flex items-center gap-3">
                <Activity className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">ROS เฉลี่ย</p>
                  <p className="font-medium">{rosStats.avg?.toFixed(3) || 0} m/s</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* ROS Statistics */}
        {(rosStats.min !== undefined || rosStats.max !== undefined) && (
          <Card className="bg-muted/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Activity className="h-5 w-5" />
                สถิติอัตราการลามไฟ (ROS)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-xl font-bold">{rosStats.min?.toFixed(3) || 0}</p>
                  <p className="text-xs text-muted-foreground">Min (m/s)</p>
                </div>
                <div>
                  <p className="text-xl font-bold">{rosStats.avg?.toFixed(3) || 0}</p>
                  <p className="text-xs text-muted-foreground">Avg (m/s)</p>
                </div>
                <div>
                  <p className="text-xl font-bold">{rosStats.max?.toFixed(3) || 0}</p>
                  <p className="text-xs text-muted-foreground">Max (m/s)</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Optimization Result */}
        {incident.optimization_result && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">ผลการจัดสรรทรัพยากร</CardTitle>
            </CardHeader>
            <CardContent>
              <OptimizationResultCard 
                result={incident.optimization_result as { status: "success" | "error"; result: { zones: Record<string, { do: number; teams: number; time: number; unfinished_area: number }> }}}
                firebreakArea={cellStatus.firebreak_area_m2 || 0}
              />
            </CardContent>
          </Card>
        )}

        {/* Status History */}
        {statusHistory.length > 0 && (
          <Card className="bg-muted/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5" />
                ประวัติการอัปเดตสถานะ
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {statusHistory.slice().reverse().map((update, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-background/50">
                    <div className={cn(
                      "p-2 rounded-full",
                      update.status === "burning" ? "bg-destructive/20" : 
                      update.status === "contained" ? "bg-warning/20" : "bg-success/20"
                    )}>
                      {update.status === "burning" ? (
                        <Flame className="h-4 w-4 text-destructive" />
                      ) : update.status === "contained" ? (
                        <Shield className="h-4 w-4 text-warning" />
                      ) : (
                        <CheckCircle className="h-4 w-4 text-success" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                        <p className="font-medium capitalize">
                          {update.status === "burning" ? "กำลังไหม้" : 
                           update.status === "contained" ? "ควบคุมได้" : "ดับแล้ว"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(update.updated_at).toLocaleString("th-TH")}
                        </p>
                      </div>
                      <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                        <User className="h-3 w-3" />
                        {update.updated_by}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}
