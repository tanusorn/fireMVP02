import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import MainLayout from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  AlertTriangle, 
  CheckCircle, 
  Flame, 
  Activity, 
  MapPin, 
  Clock,
  TrendingUp,
  ArrowRight,
  Shield
} from "lucide-react";
import { getIncidentsFromDb, getIncidentStats, IncidentDbRecord } from "@/api/incidentsDb";
import { cn } from "@/lib/utils";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";

const COLORS = {
  destructive: "hsl(var(--destructive))",
  warning: "hsl(var(--warning))",
  success: "hsl(var(--success))",
  primary: "hsl(var(--primary))",
  muted: "hsl(var(--muted))",
};

export default function IncidentsDashboard() {
  const [incidents, setIncidents] = useState<IncidentDbRecord[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    contained: 0,
    resolved: 0,
    burning: 0,
    extinguished: 0,
    high: 0,
    medium: 0,
    low: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [incidentData, statsData] = await Promise.all([
          getIncidentsFromDb(),
          getIncidentStats(),
        ]);
        setIncidents(incidentData);
        setStats(statsData);
      } catch (error) {
        console.error("Error loading dashboard data:", error);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  const fireStatusData = [
    { name: "กำลังไหม้", value: stats.burning, color: COLORS.destructive },
    { name: "ดับแล้ว", value: stats.extinguished, color: COLORS.success },
  ].filter(d => d.value > 0);

  const severityData = [
    { name: "สูง", value: stats.high, color: COLORS.destructive },
    { name: "ปานกลาง", value: stats.medium, color: COLORS.warning },
    { name: "ต่ำ", value: stats.low, color: COLORS.success },
  ].filter(d => d.value > 0);

  const statusData = [
    { name: "Active", value: stats.active },
    { name: "Contained", value: stats.contained },
    { name: "Resolved", value: stats.resolved },
  ];

  const recentIncidents = incidents.slice(0, 5);

  if (isLoading) {
    return (
      <MainLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
          <div className="grid lg:grid-cols-2 gap-6">
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">แดชบอร์ดเหตุการณ์</h1>
            <p className="text-muted-foreground">ภาพรวมเหตุการณ์ไฟป่าทั้งหมด</p>
          </div>
          <Button asChild>
            <Link to="/incidents">
              ดูทั้งหมด
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-2 border-primary/30 bg-primary/5">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-bold text-primary">{stats.total}</p>
                  <p className="text-sm text-muted-foreground">เหตุการณ์ทั้งหมด</p>
                </div>
                <Activity className="h-10 w-10 text-primary/50" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-destructive/30 bg-destructive/5">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-bold text-destructive">{stats.active}</p>
                  <p className="text-sm text-muted-foreground">กำลังดำเนินการ</p>
                </div>
                <Flame className="h-10 w-10 text-destructive/50" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-warning/30 bg-warning/5">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-bold text-warning">{stats.contained}</p>
                  <p className="text-sm text-muted-foreground">ควบคุมได้</p>
                </div>
                <Shield className="h-10 w-10 text-warning/50" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-success/30 bg-success/5">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-bold text-success">{stats.resolved}</p>
                  <p className="text-sm text-muted-foreground">แก้ไขแล้ว</p>
                </div>
                <CheckCircle className="h-10 w-10 text-success/50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Fire Status Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Flame className="h-5 w-5" />
                สถานะไฟ
              </CardTitle>
            </CardHeader>
            <CardContent>
              {fireStatusData.length > 0 ? (
                <div className="flex items-center gap-6">
                  <ResponsiveContainer width={160} height={160}>
                    <PieChart>
                      <Pie
                        data={fireStatusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={70}
                        dataKey="value"
                      >
                        {fireStatusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-3">
                    {fireStatusData.map((item) => (
                      <div key={item.name} className="flex items-center gap-3">
                        <div 
                          className="w-4 h-4 rounded-full" 
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-sm">{item.name}</span>
                        <span className="font-bold">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="h-40 flex items-center justify-center text-muted-foreground">
                  ไม่มีข้อมูล
                </div>
              )}
            </CardContent>
          </Card>

          {/* Severity Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                ระดับความรุนแรง
              </CardTitle>
            </CardHeader>
            <CardContent>
              {severityData.length > 0 ? (
                <div className="flex items-center gap-6">
                  <ResponsiveContainer width={160} height={160}>
                    <PieChart>
                      <Pie
                        data={severityData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={70}
                        dataKey="value"
                      >
                        {severityData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-3">
                    {severityData.map((item) => (
                      <div key={item.name} className="flex items-center gap-3">
                        <div 
                          className="w-4 h-4 rounded-full" 
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-sm">{item.name}</span>
                        <span className="font-bold">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="h-40 flex items-center justify-center text-muted-foreground">
                  ไม่มีข้อมูล
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Status Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              สถานะเหตุการณ์
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={statusData}>
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Recent Incidents */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5" />
              เหตุการณ์ล่าสุด
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentIncidents.length > 0 ? (
              <div className="space-y-3">
                {recentIncidents.map((incident) => (
                  <Link
                    key={incident.id}
                    to={`/incidents/${incident.id}`}
                    className="block"
                  >
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "p-2 rounded-full",
                          incident.fire_status === "burning" 
                            ? "bg-destructive/20" 
                            : "bg-success/20"
                        )}>
                          {incident.fire_status === "burning" ? (
                            <Flame className="h-4 w-4 text-destructive" />
                          ) : (
                            <CheckCircle className="h-4 w-4 text-success" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">Zone {incident.zone}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {incident.lat.toFixed(4)}, {incident.lon.toFixed(4)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant="secondary"
                          className={cn(
                            incident.severity === "high" && "bg-destructive/20 text-destructive",
                            incident.severity === "medium" && "bg-warning/20 text-warning",
                            incident.severity === "low" && "bg-success/20 text-success"
                          )}
                        >
                          {incident.severity === "high" ? "สูง" : incident.severity === "medium" ? "ปานกลาง" : "ต่ำ"}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {incident.created_at && new Date(incident.created_at).toLocaleDateString("th-TH")}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="h-40 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <AlertTriangle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>ยังไม่มีเหตุการณ์</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
