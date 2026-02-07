import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  Users, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  Target,
  MapPin,
  Ruler
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ZoneResult {
  do: number;
  teams: number;
  time: number;
  unfinished_area: number;
}

interface OptimizationResult {
  status: "success" | "error";
  result: {
    zones: {
      [key: string]: ZoneResult;
    };
  };
}

interface Props {
  result: OptimizationResult;
  firebreakArea?: number;
}

export default function OptimizationResultCard({ result, firebreakArea = 0 }: Props) {
  const zones = result.result?.zones || {};
  const zoneKeys = Object.keys(zones);

  // Check if no deployment is needed
  const noDeploymentNeeded = firebreakArea === 0 || zoneKeys.every(key => {
    const zone = zones[key];
    return zone.unfinished_area === 0 && zone.teams === 0;
  });

  if (result.status === "error") {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Optimization Failed</AlertTitle>
        <AlertDescription>
          Unable to calculate resource allocation. Please try again.
        </AlertDescription>
      </Alert>
    );
  }

  if (noDeploymentNeeded) {
    return (
      <Card className="border-2 border-success/50 bg-success/5">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-success/20">
              <CheckCircle className="h-8 w-8 text-success" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-success">No Deployment Required</h3>
              <p className="text-muted-foreground">
                Firebreak area is 0 or already complete. No teams need to be deployed.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Status Header */}
      <Card className="border-2 border-primary/30 bg-primary/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Optimization Results
            <Badge variant="default" className="ml-auto">
              {result.status.toUpperCase()}
            </Badge>
          </CardTitle>
        </CardHeader>
        {firebreakArea > 0 && (
          <CardContent className="pt-0">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Ruler className="h-4 w-4" />
              Total Firebreak Area: <span className="font-medium text-foreground">{firebreakArea.toLocaleString()} m²</span>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Zone Results */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {zoneKeys.map((zoneName) => {
          const zone = zones[zoneName];
          const hasUnfinished = zone.unfinished_area > 0;
          const effectiveTeams = zone.unfinished_area === 0 && firebreakArea === 0 ? 0 : zone.teams;
          
          return (
            <Card 
              key={zoneName}
              className={cn(
                "border-2 transition-all hover:shadow-lg",
                hasUnfinished 
                  ? "border-warning/50 bg-warning/5" 
                  : "border-success/50 bg-success/5"
              )}
            >
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Zone {zoneName}
                  </span>
                  <Badge 
                    variant={hasUnfinished ? "secondary" : "default"}
                    className={cn(
                      hasUnfinished 
                        ? "bg-warning/20 text-warning border-warning" 
                        : "bg-success/20 text-success border-success"
                    )}
                  >
                    DO: {zone.do}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Teams */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-background/50">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    <span className="text-sm text-muted-foreground">Teams</span>
                  </div>
                  <span className="text-2xl font-bold text-primary">{effectiveTeams}</span>
                </div>

                {/* Operation Time */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-background/50">
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-info" />
                    <span className="text-sm text-muted-foreground">Time</span>
                  </div>
                  <span className="text-2xl font-bold text-info">{zone.time.toFixed(1)} hrs</span>
                </div>

                {/* Unfinished Area */}
                <div className={cn(
                  "flex items-center justify-between p-3 rounded-lg",
                  hasUnfinished ? "bg-warning/10" : "bg-success/10"
                )}>
                  <div className="flex items-center gap-2">
                    {hasUnfinished ? (
                      <AlertTriangle className="h-5 w-5 text-warning" />
                    ) : (
                      <CheckCircle className="h-5 w-5 text-success" />
                    )}
                    <span className="text-sm text-muted-foreground">Unfinished</span>
                  </div>
                  <span className={cn(
                    "text-xl font-bold",
                    hasUnfinished ? "text-warning" : "text-success"
                  )}>
                    {zone.unfinished_area.toLocaleString()} m²
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Summary */}
      <Card className="bg-muted/30">
        <CardContent className="p-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-3xl font-bold text-primary">
                {zoneKeys.reduce((sum, key) => sum + (zones[key].unfinished_area === 0 && firebreakArea === 0 ? 0 : zones[key].teams), 0)}
              </p>
              <p className="text-xs text-muted-foreground">Total Teams</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-info">
                {Math.max(...zoneKeys.map(key => zones[key].time)).toFixed(1)} hrs
              </p>
              <p className="text-xs text-muted-foreground">Max Time</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-warning">
                {zoneKeys.reduce((sum, key) => sum + zones[key].unfinished_area, 0).toLocaleString()} m²
              </p>
              <p className="text-xs text-muted-foreground">Total Unfinished</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
