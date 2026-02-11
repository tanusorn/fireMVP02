import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Wind, 
  MapPin, 
  Grid3X3, 
  Clock, 
  Flame, 
  TreeDeciduous, 
  Square, 
  Shield,
  TrendingUp,
  TrendingDown,
  Activity,
  Compass
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SimulationResult {
  wind_speed: number;
  wind_direction: number;
  summary: {
    unburned: { area_m2: number };
    burning: { area_m2: number };
    burned: { area_m2: number };
    firebreak: { area_m2: number };
  };
}

interface SimulationParams {
  lat: number;
  lon: number;
  grid_x: number;
  grid_y: number;
  cell_size?: number;
  sim_minutes: number;
  year: number;
  month: number;
  day: number;
}

interface Props {
  result: SimulationResult;
  params: SimulationParams;
  rosStats?: { mean: number; min: number; max: number };
}

export default function SimulationResultCard({ result, params, rosStats }: Props) {
  const totalCells = params.grid_x * params.grid_y;
  const cellSizeM = params.cell_size || 20;
  const totalArea = totalCells * cellSizeM * cellSizeM;
  
  const burnedArea = result.summary.burned.area_m2 || 0;
  const burningArea = result.summary.burning.area_m2 || 0;
  const unburnedArea = result.summary.unburned.area_m2 || 0;
  const firebreakArea = result.summary.firebreak.area_m2 || 0;
  
  const burnedHa = burnedArea / 10000;
  const burnPercentageAll = totalArea > 0 ? ((burnedArea + burningArea) / totalArea) * 100 : 0;
  const fuelArea = totalArea - firebreakArea;
  const burnPercentageOfFuel = fuelArea > 0 ? ((burnedArea + burningArea) / fuelArea) * 100 : 0;

  const getWindDirection = (deg: number) => {
    const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
    const index = Math.round(deg / 45) % 8;
    return directions[index];
  };

  const cellCards = [
    { 
      label: "Unburned", 
      labelTh: "ยังไม่ไหม้", 
      value: unburnedArea, 
      icon: TreeDeciduous, 
      color: "text-success", 
      bgColor: "bg-success/10 border-success/30" 
    },
    { 
      label: "Burning", 
      labelTh: "กำลังไหม้", 
      value: burningArea, 
      icon: Flame, 
      color: "text-warning", 
      bgColor: "bg-warning/10 border-warning/30" 
    },
    { 
      label: "Burned", 
      labelTh: "ไหม้แล้ว", 
      value: burnedArea, 
      icon: Square, 
      color: "text-destructive", 
      bgColor: "bg-destructive/10 border-destructive/30" 
    },
    { 
      label: "Firebreak", 
      labelTh: "แนวกันไฟ", 
      value: firebreakArea, 
      icon: Shield, 
      color: "text-primary", 
      bgColor: "bg-primary/10 border-primary/30" 
    },
  ];

  return (
    <div className="space-y-4">
      {/* Wind Information */}
      <Card className="border-2 border-info/30 bg-info/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Wind className="h-5 w-5 text-info" />
            Wind Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-background/50">
              <Activity className="h-8 w-8 text-info" />
              <div>
                <p className="text-2xl font-bold">{result.wind_speed.toFixed(1)} m/s</p>
                <p className="text-xs text-muted-foreground">Wind Speed</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-background/50">
              <Compass className="h-8 w-8 text-info" />
              <div>
                <p className="text-2xl font-bold">{result.wind_direction.toFixed(0)}°</p>
                <p className="text-xs text-muted-foreground">
                  Direction ({getWindDirection(result.wind_direction)})
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Simulation Parameters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Grid3X3 className="h-5 w-5" />
            Simulation Parameters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <MapPin className="h-4 w-4" />
                <span className="text-xs">Location</span>
              </div>
              <p className="font-medium text-sm">{params.lat.toFixed(4)}, {params.lon.toFixed(4)}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Grid3X3 className="h-4 w-4" />
                <span className="text-xs">Grid Size</span>
              </div>
              <p className="font-medium text-sm">{params.grid_x} × {params.grid_y}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Square className="h-4 w-4" />
                <span className="text-xs">Cell Size</span>
              </div>
              <p className="font-medium text-sm">{cellSizeM} m</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Clock className="h-4 w-4" />
                <span className="text-xs">Duration</span>
              </div>
              <p className="font-medium text-sm">{params.sim_minutes} min</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cell Status */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Grid3X3 className="h-5 w-5" />
            Cell Status
            <Badge variant="secondary" className="ml-auto">{totalCells.toLocaleString()} cells</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {cellCards.map((card) => (
              <Card key={card.label} className={cn("border", card.bgColor)}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <card.icon className={cn("h-8 w-8 shrink-0", card.color)} />
                    <div className="min-w-0">
                      <p className="text-xl font-bold">{card.value.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">{card.labelTh} (m²)</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Burned Area Statistics */}
      <Card className="border-2 border-destructive/30 bg-destructive/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Flame className="h-5 w-5 text-destructive" />
            Burned Area Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center p-4 rounded-lg bg-background/50">
              <p className="text-3xl font-bold text-destructive">{burnedArea.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Burned Area (m²)</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-background/50">
              <p className="text-3xl font-bold text-destructive">{burnedHa.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">Burned Area (ha)</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-background/50">
              <p className="text-3xl font-bold">{burnPercentageAll.toFixed(1)}%</p>
              <p className="text-xs text-muted-foreground">% of Total Area</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-background/50">
              <p className="text-3xl font-bold">{burnPercentageOfFuel.toFixed(1)}%</p>
              <p className="text-xs text-muted-foreground">% of Fuel Area</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ROS Statistics */}
      {rosStats && (
        <Card className="border-2 border-warning/30 bg-warning/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="h-5 w-5 text-warning" />
              Rate of Spread (ROS) Statistics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 rounded-lg bg-background/50">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <TrendingDown className="h-4 w-4 text-success" />
                </div>
                <p className="text-2xl font-bold">{rosStats.min.toFixed(3)}</p>
                <p className="text-xs text-muted-foreground">Min (m/s)</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-background/50 border-2 border-warning/50">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Activity className="h-4 w-4 text-warning" />
                </div>
                <p className="text-2xl font-bold text-warning">{rosStats.mean.toFixed(3)}</p>
                <p className="text-xs text-muted-foreground">Mean (m/s)</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-background/50">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <TrendingUp className="h-4 w-4 text-destructive" />
                </div>
                <p className="text-2xl font-bold">{rosStats.max.toFixed(3)}</p>
                <p className="text-xs text-muted-foreground">Max (m/s)</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
