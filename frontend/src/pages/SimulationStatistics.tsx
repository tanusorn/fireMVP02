import { useEffect, useState } from "react";
import MainLayout from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { 
  Download, 
  BarChart3, 
  Flame, 
  Wind, 
  Activity,
  AlertTriangle,
  TrendingUp
} from "lucide-react";
import * as XLSX from "xlsx";

interface SimulationResult {
  wind_speed?: number;
  wind_direction?: number;
  grid_x?: number;
  grid_y?: number;
  cell_size?: number;
  sim_minutes?: number;
  summary?: {
    unburned?: { area_m2?: number; cells?: number };
    burning?: { area_m2?: number; cells?: number };
    burned?: { area_m2?: number; cells?: number };
    firebreak?: { area_m2?: number; cells?: number };
  };
  ros_statistics?: {
    mean?: number;
    min?: number;
    max?: number;
  };
}

interface SimulationParams {
  lat?: number;
  lon?: number;
  grid_x?: number;
  grid_y?: number;
  cell_size?: number;
  sim_minutes?: number;
}

interface ProcessedReport {
  id: string;
  report_code: string;
  lat: number;
  lon: number;
  wind_speed: number;
  wind_direction: number;
  grid_x: number;
  grid_y: number;
  cell_size: number;
  sim_minutes: number;
  total_cells: number;
  burning_cells: number;
  burned_cells: number;
  burned_area_m2: number;
  burned_area_ha: number;
  burn_percentage: number;
  ros_mean: number;
  ros_min: number;
  ros_max: number;
  created_at: string;
}

export default function SimulationStatistics() {
  const [reports, setReports] = useState<ProcessedReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchReports();
  }, []);

  async function fetchReports() {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("fire_reports")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const processed = (data || []).map((row) => {
        const params = (row.simulation_params || {}) as SimulationParams;
        const result = (row.simulation_result || {}) as SimulationResult;
        const summary = result.summary || {};
        const ros = result.ros_statistics || {};

        const grid_x = params.grid_x || result.grid_x || 0;
        const grid_y = params.grid_y || result.grid_y || 0;
        const total_cells = grid_x * grid_y;

        const burning_cells = summary.burning?.cells || 0;
        const burned_cells = summary.burned?.cells || 0;
        const burned_area_m2 = summary.burned?.area_m2 || 0;

        return {
          id: row.id,
          report_code: row.report_code,
          lat: row.lat,
          lon: row.lon,
          wind_speed: result.wind_speed || 0,
          wind_direction: result.wind_direction || 0,
          grid_x,
          grid_y,
          cell_size: params.cell_size || result.cell_size || 0,
          sim_minutes: params.sim_minutes || result.sim_minutes || 0,
          total_cells,
          burning_cells,
          burned_cells,
          burned_area_m2,
          burned_area_ha: burned_area_m2 / 10000,
          burn_percentage: total_cells > 0 ? (burned_cells / total_cells) * 100 : 0,
          ros_mean: ros.mean || 0,
          ros_min: ros.min || 0,
          ros_max: ros.max || 0,
          created_at: row.created_at || "",
        };
      });

      setReports(processed);
    } catch (error) {
      console.error("Error fetching reports:", error);
    } finally {
      setIsLoading(false);
    }
  }

  // Dashboard calculations
  const totalSimulations = reports.length;
  const avgBurnedArea = reports.length > 0 
    ? reports.reduce((sum, r) => sum + r.burned_area_ha, 0) / reports.length 
    : 0;
  const maxROS = reports.length > 0 
    ? Math.max(...reports.map(r => r.ros_max)) 
    : 0;
  const zeroBurnSimulations = reports.filter(r => r.burned_cells === 0).length;

  function handleExport() {
    if (reports.length === 0) return;

    const exportData = reports.map(r => ({
      "รหัสรายงาน": r.report_code,
      "ละติจูด": r.lat.toFixed(6),
      "ลองจิจูด": r.lon.toFixed(6),
      "ความเร็วลม (m/s)": r.wind_speed.toFixed(2),
      "ทิศทางลม (deg)": r.wind_direction.toFixed(1),
      "Grid X": r.grid_x,
      "Grid Y": r.grid_y,
      "ขนาดเซลล์ (m)": r.cell_size,
      "เวลาจำลอง (นาที)": r.sim_minutes,
      "เซลล์ทั้งหมด": r.total_cells,
      "เซลล์ที่กำลังไหม้": r.burning_cells,
      "เซลล์ที่ไหม้แล้ว": r.burned_cells,
      "พื้นที่ไหม้ (m²)": r.burned_area_m2.toFixed(2),
      "พื้นที่ไหม้ (ha)": r.burned_area_ha.toFixed(4),
      "เปอร์เซ็นต์การไหม้": r.burn_percentage.toFixed(2) + "%",
      "ROS เฉลี่ย": r.ros_mean.toFixed(4),
      "ROS ต่ำสุด": r.ros_min.toFixed(4),
      "ROS สูงสุด": r.ros_max.toFixed(4),
      "วันที่สร้าง": new Date(r.created_at).toLocaleString("th-TH"),
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Simulations");

    const today = new Date().toISOString().split("T")[0];
    XLSX.writeFile(workbook, `simulation_statistics_${today}.xlsx`);
  }

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">สถิติการจำลอง</h1>
            <p className="text-muted-foreground">ข้อมูลผลการจำลองไฟจากฐานข้อมูล</p>
          </div>
          <Button 
            onClick={handleExport} 
            disabled={reports.length === 0}
            className="min-h-[44px]"
          >
            <Download className="h-4 w-4 mr-2" />
            Export Excel
          </Button>
        </div>

        {/* Dashboard Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                การจำลองทั้งหมด
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{totalSimulations}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Flame className="h-4 w-4" />
                พื้นที่ไหม้เฉลี่ย
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{avgBurnedArea.toFixed(2)}</p>
              <p className="text-sm text-muted-foreground">เฮกตาร์</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                ROS สูงสุด
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{maxROS.toFixed(3)}</p>
              <p className="text-sm text-muted-foreground">m/s</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Activity className="h-4 w-4" />
                ไม่มีการไหม้
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{zeroBurnSimulations}</p>
              <p className="text-sm text-muted-foreground">รายงาน</p>
            </CardContent>
          </Card>
        </div>

        {/* Data Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wind className="h-5 w-5" />
              ตารางข้อมูลการจำลอง
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
                <p className="text-muted-foreground mt-4">กำลังโหลดข้อมูล...</p>
              </div>
            ) : reports.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>ไม่พบข้อมูลการจำลอง</p>
                <p className="text-sm mt-2">ทำการจำลองไฟเพื่อดูข้อมูลสถิติ</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[100px]">รหัส</TableHead>
                      <TableHead className="min-w-[80px]">ลม (m/s)</TableHead>
                      <TableHead className="min-w-[80px]">ทิศทาง</TableHead>
                      <TableHead className="min-w-[90px]">พิกัด</TableHead>
                      <TableHead className="min-w-[60px]">Grid</TableHead>
                      <TableHead className="min-w-[70px]">เซลล์</TableHead>
                      <TableHead className="min-w-[100px]">พื้นที่ไหม้</TableHead>
                      <TableHead className="min-w-[80px]">% ไหม้</TableHead>
                      <TableHead className="min-w-[120px]">ROS (m/s)</TableHead>
                      <TableHead className="min-w-[140px]">วันที่</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reports.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="font-medium">
                          <span className="truncate block max-w-[100px]">
                            {row.report_code}
                          </span>
                        </TableCell>
                        <TableCell>{row.wind_speed.toFixed(1)}</TableCell>
                        <TableCell>{row.wind_direction.toFixed(0)}°</TableCell>
                        <TableCell className="text-xs">
                          {row.lat.toFixed(4)}, {row.lon.toFixed(4)}
                        </TableCell>
                        <TableCell>{row.grid_x}×{row.grid_y}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {row.burned_cells}/{row.total_cells}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">{row.burned_area_ha.toFixed(2)}</span>
                          <span className="text-muted-foreground text-xs ml-1">ha</span>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={row.burn_percentage > 30 ? "destructive" : row.burn_percentage > 10 ? "secondary" : "outline"}
                          >
                            {row.burn_percentage.toFixed(1)}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">
                          <span className="text-muted-foreground">min:</span> {row.ros_min.toFixed(3)}<br/>
                          <span className="text-muted-foreground">max:</span> {row.ros_max.toFixed(3)}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(row.created_at).toLocaleString("th-TH")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
