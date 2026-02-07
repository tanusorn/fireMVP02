import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Flame, AlertTriangle, MapPin, CheckCircle, Shield, BarChart2, Search } from "lucide-react";
import { getIncidentsFromDb, IncidentDbRecord } from "@/api/incidentsDb";
import { cn } from "@/lib/utils";
import MainLayout from "@/components/layout/MainLayout";
import FilterButtonRow from "@/components/filters/FilterButtonRow";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

type FireStatus = "burning" | "contained" | "extinguished";

export default function Dashboard() {
  const [incidents, setIncidents] = useState<IncidentDbRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterZone, setFilterZone] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<FireStatus | "all">("all");
  const [filterRisk, setFilterRisk] = useState<"high" | "medium" | "low" | "all">("all");

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

  // Get unique zones from real data
  const zones = useMemo(() => [...new Set(incidents.map(i => i.zone))].sort(), [incidents]);

  // Apply filters including search
  const filteredIncidents = incidents.filter((i) => {
    const matchesZone = filterZone === "all" || i.zone === filterZone;
    const matchesStatus = filterStatus === "all" || i.fire_status === filterStatus;
    const matchesRisk = filterRisk === "all" || i.severity === filterRisk;
    const matchesSearch = !search || 
      i.id?.toLowerCase().includes(search.toLowerCase()) ||
      i.zone.toLowerCase().includes(search.toLowerCase()) ||
      i.report_code?.toLowerCase().includes(search.toLowerCase());
    return matchesZone && matchesStatus && matchesRisk && matchesSearch;
  });

  const activeCount = filteredIncidents.filter((i) => i.status === "active").length;
  const containedCount = filteredIncidents.filter((i) => i.status === "contained").length;
  const resolvedCount = filteredIncidents.filter((i) => i.status === "resolved").length;
  const highSeverityCount = filteredIncidents.filter((i) => i.severity === "high").length;
  const mediumSeverityCount = filteredIncidents.filter((i) => i.severity === "medium").length;
  const lowSeverityCount = filteredIncidents.filter((i) => i.severity === "low").length;
  const burningCount = filteredIncidents.filter((i) => i.fire_status === "burning").length;
  const extinguishedCount = filteredIncidents.filter((i) => i.fire_status === "extinguished").length;
  const totalBurnedArea = filteredIncidents.reduce((sum, i) => {
    const cellStatus = i.cell_status as { burned_area_m2?: number } || {};
    return sum + (cellStatus.burned_area_m2 || 0);
  }, 0);

  // Summary cards from REAL database data only
  const summaryCards = [
    { title: "เหตุการณ์ทั้งหมด", value: filteredIncidents.length, icon: BarChart2, color: "text-primary", bg: "bg-primary/10" },
    { title: "กำลังดำเนินการ", value: activeCount, icon: Flame, color: "text-destructive", bg: "bg-destructive/10" },
    { title: "ความเสี่ยงสูง", value: highSeverityCount, icon: AlertTriangle, color: "text-warning", bg: "bg-warning/10" },
    { title: "แก้ไขแล้ว", value: resolvedCount, icon: CheckCircle, color: "text-success", bg: "bg-success/10" },
  ];

  // Zone data from real incidents
  const zoneData = useMemo(() => {
    return zones.map(zone => ({
      name: `Zone ${zone}`,
      incidents: filteredIncidents.filter(i => i.zone === zone).length,
      burned: filteredIncidents.filter(i => i.zone === zone).reduce((sum, i) => {
        const cellStatus = i.cell_status as { burned_area_m2?: number } || {};
        return sum + (cellStatus.burned_area_m2 || 0);
      }, 0) / 1000,
    }));
  }, [zones, filteredIncidents]);

  const statusData = [
    { name: "กำลังไหม้", value: burningCount, color: "hsl(var(--destructive))" },
    { name: "ควบคุมได้", value: containedCount, color: "hsl(var(--warning))" },
    { name: "ดับแล้ว", value: extinguishedCount, color: "hsl(var(--success))" },
  ];

  const severityData = [
    { name: "สูง", value: highSeverityCount, color: "hsl(var(--destructive))" },
    { name: "ปานกลาง", value: mediumSeverityCount, color: "hsl(var(--warning))" },
    { name: "ต่ำ", value: lowSeverityCount, color: "hsl(var(--success))" },
  ];

  const severityColors = {
    high: "bg-destructive text-destructive-foreground",
    medium: "bg-warning text-warning-foreground",
    low: "bg-success text-success-foreground",
  };

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">แดชบอร์ด</h1>
          <p className="text-muted-foreground">ภาพรวมสถิติเหตุการณ์ไฟป่า</p>
        </div>

        {/* Search + Filter Row - Same as Incidents page */}
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
          
          {/* 3-Button Filter Row - Reuse same component as Incidents */}
          <FilterButtonRow
            zones={zones}
            activeZone={filterZone}
            onZoneChange={setFilterZone}
            activeStatus={filterStatus}
            onStatusChange={(v) => setFilterStatus(v as FireStatus | "all")}
            activeSeverity={filterRisk}
            onSeverityChange={(v) => setFilterRisk(v as "high" | "medium" | "low" | "all")}
          />
        </div>

        {/* Summary Cards - All from real database */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {summaryCards.map((card) => (
            <Card key={card.title} className="border-border/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className={cn("p-2 rounded-lg", card.bg)}>
                    <card.icon className={cn("h-5 w-5", card.color)} />
                  </div>
                </div>
                <div className="mt-3">
                  <p className="text-2xl font-bold">{card.value}</p>
                  <p className="text-xs text-muted-foreground">{card.title}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Incidents by Zone */}
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">เหตุการณ์ตามโซน</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-[250px] bg-muted/50 rounded-lg animate-pulse" />
              ) : zoneData.length === 0 ? (
                <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                  ไม่มีข้อมูล
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={zoneData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: "hsl(var(--card))", 
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px"
                      }} 
                    />
                    <Bar dataKey="incidents" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="เหตุการณ์" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Fire Status Distribution */}
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">สถานะไฟ</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-[250px] bg-muted/50 rounded-lg animate-pulse" />
              ) : filteredIncidents.length === 0 ? (
                <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                  ไม่มีข้อมูล
                </div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={statusData.filter(d => d.value > 0)}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {statusData.filter(d => d.value > 0).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: "hsl(var(--card))", 
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px"
                        }} 
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex justify-center gap-4 mt-2">
                    {statusData.map((item) => (
                      <div key={item.name} className="flex items-center gap-2 text-sm">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                        <span>{item.name}: {item.value}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Pie Charts Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Severity Distribution */}
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">ระดับความเสี่ยง</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-[200px] bg-muted/50 rounded-lg animate-pulse" />
              ) : filteredIncidents.length === 0 ? (
                <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                  ไม่มีข้อมูล
                </div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={severityData.filter(d => d.value > 0)}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {severityData.filter(d => d.value > 0).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: "hsl(var(--card))", 
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px"
                        }} 
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex justify-center gap-4 mt-2">
                    {severityData.map((item) => (
                      <div key={item.name} className="flex items-center gap-2 text-sm">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                        <span>{item.name}: {item.value}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card className="border-border/50 md:col-span-2 lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">สถิติโดยรวม</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <span className="text-sm text-muted-foreground">เหตุการณ์ทั้งหมด</span>
                <span className="font-bold">{filteredIncidents.length}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <span className="text-sm text-muted-foreground">พื้นที่ไหม้รวม</span>
                <span className="font-bold">{(totalBurnedArea / 1000).toFixed(1)}k ตร.ม.</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <span className="text-sm text-muted-foreground">ไฟกำลังไหม้</span>
                <span className="font-bold text-destructive">{burningCount}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <span className="text-sm text-muted-foreground">ดับแล้ว</span>
                <span className="font-bold text-success">{extinguishedCount}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Incidents */}
        <Card className="border-border/50">
          <CardHeader className="px-4 sm:px-6 pb-3">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-lg sm:text-xl">เหตุการณ์ล่าสุด</CardTitle>
              <Link to="/incidents">
                <Button variant="ghost" size="sm" className="h-9 px-3 text-sm font-medium">
                  ดูทั้งหมด
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="px-3 sm:px-6 pb-4 space-y-2 sm:space-y-3">
            {isLoading ? (
              <div className="space-y-2 sm:space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-20 sm:h-16 bg-muted/50 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : filteredIncidents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>ไม่พบเหตุการณ์</p>
                <p className="text-sm mt-2">ทำการจำลองไฟเพื่อสร้างเหตุการณ์ใหม่</p>
              </div>
            ) : (
              filteredIncidents.slice(0, 4).map((incident) => (
                <Link key={incident.id} to={`/incidents/${incident.id}`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 sm:p-4 rounded-lg bg-muted/30 hover:bg-muted/50 active:bg-muted/60 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2 rounded-lg bg-card flex-shrink-0">
                        <MapPin className="h-4 w-4 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm sm:text-base truncate">
                          {incident.report_code || `Zone ${incident.zone}`}
                        </p>
                        <p className="text-xs sm:text-sm text-muted-foreground">
                          {incident.created_at && new Date(incident.created_at).toLocaleString("th-TH")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap pl-11 sm:pl-0">
                      <Badge className={`${severityColors[incident.severity]} text-xs px-2 py-0.5`}>
                        {incident.severity === "high" ? "สูง" : incident.severity === "medium" ? "ปานกลาง" : "ต่ำ"}
                      </Badge>
                      <Badge className={`text-xs px-2 py-0.5 ${incident.fire_status === "burning" ? "bg-destructive text-destructive-foreground" : incident.fire_status === "contained" ? "bg-warning text-warning-foreground" : "bg-success text-success-foreground"}`}>
                        {incident.fire_status === "burning" ? (
                          <><Flame className="h-3 w-3 mr-1 flex-shrink-0" /> ไหม้</>
                        ) : incident.fire_status === "contained" ? (
                          <><Shield className="h-3 w-3 mr-1 flex-shrink-0" /> คุม</>
                        ) : (
                          <><CheckCircle className="h-3 w-3 mr-1 flex-shrink-0" /> ดับ</>
                        )}
                      </Badge>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
