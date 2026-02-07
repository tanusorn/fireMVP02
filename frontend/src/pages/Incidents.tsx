import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import MainLayout from "@/components/layout/MainLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { MapPin, Search, AlertTriangle, Clock, Flame, CheckCircle, Shield } from "lucide-react";
import { getIncidentsFromDb, IncidentDbRecord } from "@/api/incidentsDb";
import { cn } from "@/lib/utils";
import FilterButtonRow from "@/components/filters/FilterButtonRow";

type FireStatusFilter = "burning" | "contained" | "extinguished" | "all";
type SeverityFilter = "high" | "medium" | "low" | "all";

export default function Incidents() {
  const [incidents, setIncidents] = useState<IncidentDbRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeZone, setActiveZone] = useState<string>("all");
  const [activeStatus, setActiveStatus] = useState<FireStatusFilter>("all");
  const [activeRisk, setActiveRisk] = useState<SeverityFilter>("all");

  useEffect(() => {
    getIncidentsFromDb()
      .then((data) => {
        setIncidents(data);
        setIsLoading(false);
      })
      .catch((error) => {
        console.error("Error loading incidents:", error);
        setIsLoading(false);
      });
  }, []);

  const filtered = incidents.filter((i) => {
    const matchesZone = activeZone === "all" || i.zone === activeZone;
    const matchesSearch = 
      i.id?.toLowerCase().includes(search.toLowerCase()) ||
      i.zone.toLowerCase().includes(search.toLowerCase()) ||
      i.report_code?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = activeStatus === "all" || i.fire_status === activeStatus;
    const matchesRisk = activeRisk === "all" || i.severity === activeRisk;
    return matchesZone && matchesSearch && matchesStatus && matchesRisk;
  });

  const severityColors = {
    high: "bg-destructive text-destructive-foreground",
    medium: "bg-warning text-warning-foreground",
    low: "bg-success text-success-foreground",
  };

  const statusColors = {
    active: "border-destructive/50",
    contained: "border-warning/50",
    resolved: "border-success/50",
  };

  const fireStatusColors = {
    burning: "bg-destructive text-destructive-foreground",
    contained: "bg-warning text-warning-foreground",
    extinguished: "bg-success text-success-foreground",
  };

  // Get unique zones
  const zones = [...new Set(incidents.map(i => i.zone))].sort();

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold">รายงานเหตุการณ์</h1>
          <p className="text-muted-foreground">ดูและจัดการเหตุการณ์ไฟป่า</p>
        </div>

        {/* Search + Filter Row */}
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="ค้นหาเหตุการณ์..." 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
              className="pl-10 min-h-[44px]" 
            />
          </div>
          
          {/* 3-Button Filter Row */}
          <FilterButtonRow
            zones={zones}
            activeZone={activeZone}
            onZoneChange={setActiveZone}
            activeStatus={activeStatus}
            onStatusChange={(v) => setActiveStatus(v as FireStatusFilter)}
            activeSeverity={activeRisk}
            onSeverityChange={(v) => setActiveRisk(v as SeverityFilter)}
          />
        </div>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-muted/50 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {filtered.map((incident) => {
              const cellStatus = incident.cell_status as {
                unburned_area_m2?: number;
                burning_area_m2?: number;
                burned_area_m2?: number;
                firebreak_area_m2?: number;
              } || {};
              
              return (
                <Link key={incident.id} to={`/incidents/${incident.id}`}>
                  <Card className={cn(
                    "border-2 hover:shadow-lg transition-all",
                    statusColors[incident.status as keyof typeof statusColors] || "border-border"
                  )}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3 gap-2">
                        <div className="min-w-0">
                          <p className="font-bold text-lg truncate">
                            {incident.report_code || `Zone ${incident.zone}`}
                          </p>
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-3 w-3 shrink-0" /> 
                            โซน {incident.zone}
                          </p>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Badge className={severityColors[incident.severity]}>
                            {incident.severity === "high" ? "สูง" : incident.severity === "medium" ? "ปานกลาง" : "ต่ำ"}
                          </Badge>
                          <Badge className={fireStatusColors[incident.fire_status]}>
                            {incident.fire_status === "burning" ? (
                              <><Flame className="h-3 w-3 mr-1" /> ไหม้</>
                            ) : incident.fire_status === "contained" ? (
                              <><Shield className="h-3 w-3 mr-1" /> คุม</>
                            ) : (
                              <><CheckCircle className="h-3 w-3 mr-1" /> ดับ</>
                            )}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {incident.created_at && new Date(incident.created_at).toLocaleString("th-TH")}
                        </span>
                        <span className="flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          {(cellStatus.burned_area_m2 || 0).toLocaleString()} ตร.ม.
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}

        {!isLoading && filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>ไม่พบเหตุการณ์</p>
            <p className="text-sm mt-2">ลองเปลี่ยนตัวกรองหรือทำการจำลองไฟเพื่อสร้างเหตุการณ์ใหม่</p>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
