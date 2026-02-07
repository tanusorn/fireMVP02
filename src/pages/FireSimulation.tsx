import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { z } from "zod";
import MainLayout from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import zoneAMap from "@/assets/zone-a-map.jpg";
import zoneBMap from "@/assets/zone-b-map.jpg";
import zoneCMap from "@/assets/zone-c-map.jpg";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { MapPin, Navigation, Loader2, Flame, TreeDeciduous, Shield, Square, Wind, Trash2, Calculator, Bell, Upload, Image, FileText, ArrowRight } from "lucide-react";
import { simulateFire } from "@/api/fire";
import { FireSimulationResponse, ZoneType } from "@/types/api";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

// Zod schema for fire simulation input validation
const fireSimulationSchema = z.object({
  lat: z.number().min(-90, "Latitude must be between -90 and 90").max(90, "Latitude must be between -90 and 90"),
  lon: z.number().min(-180, "Longitude must be between -180 and 180").max(180, "Longitude must be between -180 and 180"),
  year: z.number().int().min(2020, "Year must be 2020 or later").max(2030, "Year must be 2030 or earlier"),
  month: z.number().int().min(1, "Month must be between 1 and 12").max(12, "Month must be between 1 and 12"),
  day: z.number().int().min(1, "Day must be between 1 and 31").max(31, "Day must be between 1 and 31"),
  grid_x: z.union([z.literal(25), z.literal(50), z.literal(100)], { errorMap: () => ({ message: "Grid X must be 25, 50, or 100" }) }),
  grid_y: z.union([z.literal(25), z.literal(50), z.literal(100)], { errorMap: () => ({ message: "Grid Y must be 25, 50, or 100" }) }),
  sim_minutes: z.number().int().min(1, "Duration must be at least 1 minute").max(360, "Duration cannot exceed 360 minutes"),
  cell_size: z.number().int().positive("Cell size must be positive"),
});

interface ContinueReportState {
  continueReport: boolean;
  reportId: string;
  reportCode: string;
  reportName: string;
}

export default function FireSimulation() {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const continueState = location.state as ContinueReportState | null;

  const [isLocating, setIsLocating] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isSendingNotification, setIsSendingNotification] = useState(false);
  const [selectedZone, setSelectedZone] = useState<ZoneType | "">("");
  const [result, setResult] = useState<FireSimulationResponse | null>(null);
  const [burnedAreaPhoto, setBurnedAreaPhoto] = useState<string | null>(null);
  const [photoFileName, setPhotoFileName] = useState<string>("");
  const [existingZones, setExistingZones] = useState<string[]>([]);

  // Report state
  const [reportId, setReportId] = useState<string | null>(continueState?.reportId || null);
  const [reportCode, setReportCode] = useState(continueState?.reportCode || "");
  const [reportName, setReportName] = useState(continueState?.reportName || "");
  const [reportSaved, setReportSaved] = useState(false);

  const [formData, setFormData] = useState({
    lat: "",
    lon: "",
    year: new Date().getFullYear().toString(),
    month: (new Date().getMonth() + 1).toString(),
    day: new Date().getDate().toString(),
    grid_x: "50",
    grid_y: "50",
    sim_minutes: "60",
  });

  useEffect(() => {
    if (continueState?.continueReport && continueState.reportId) {
      loadExistingZones(continueState.reportId);
    }
  }, [continueState]);

  const loadExistingZones = async (repId: string) => {
    const { data } = await supabase
      .from("report_zones")
      .select("zone_name")
      .eq("report_id", repId);
    
    if (data) {
      setExistingZones(data.map((z) => z.zone_name));
    }
  };

  const generateReportCode = () => {
    const date = new Date();
    const dateStr = date.toISOString().split("T")[0].replace(/-/g, "");
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `FR-${dateStr}-${random}`;
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        toast({ title: "Invalid file", description: "Please upload an image file", variant: "destructive" });
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        setBurnedAreaPhoto(event.target?.result as string);
        setPhotoFileName(file.name);
        toast({ title: "Photo uploaded", description: `${file.name} uploaded successfully` });
      };
      reader.readAsDataURL(file);
    }
  };

  const removePhoto = () => {
    setBurnedAreaPhoto(null);
    setPhotoFileName("");
    toast({ title: "Photo removed" });
  };

  const detectLocation = () => {
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setFormData({
          ...formData,
          lat: pos.coords.latitude.toFixed(6),
          lon: pos.coords.longitude.toFixed(6),
        });
        setIsLocating(false);
        toast({ title: "Location detected", description: "GPS coordinates updated" });
      },
      () => {
        setIsLocating(false);
        toast({ title: "Location error", description: "Could not detect location", variant: "destructive" });
      }
    );
  };

  const handleSimulate = async () => {
    if (!formData.lat || !formData.lon) {
      toast({ title: "Missing location", description: "Please enter coordinates", variant: "destructive" });
      return;
    }
    if (!selectedZone) {
      toast({ title: "No zone selected", description: "Please select a zone", variant: "destructive" });
      return;
    }

    // Check for duplicate zones in continue mode
    if (existingZones.includes(selectedZone)) {
      toast({ title: "Duplicate zone", description: `Zone ${selectedZone} already exists in this report`, variant: "destructive" });
      return;
    }

    setIsSimulating(true);
    try {
      // Validate input with Zod schema
      const rawData = {
        lat: parseFloat(formData.lat),
        lon: parseFloat(formData.lon),
        year: parseInt(formData.year),
        month: parseInt(formData.month),
        day: parseInt(formData.day),
        grid_x: parseInt(formData.grid_x),
        grid_y: parseInt(formData.grid_y),
        sim_minutes: parseInt(formData.sim_minutes),
        cell_size: 20,
      };

      const validationResult = fireSimulationSchema.safeParse(rawData);
      
      if (!validationResult.success) {
        const errorMessage = validationResult.error.errors.map(e => e.message).join(", ");
        toast({ title: "ข้อมูลไม่ถูกต้อง", description: errorMessage, variant: "destructive" });
        setIsSimulating(false);
        return;
      }

      const validatedData = validationResult.data as {
        lat: number;
        lon: number;
        year: number;
        month: number;
        day: number;
        grid_x: 25 | 50 | 100;
        grid_y: 25 | 50 | 100;
        sim_minutes: number;
        cell_size: number;
      };
      const response = await simulateFire(validatedData);
      setResult(response);

      // Generate or use existing report code
      let currentReportId = reportId;
      let currentReportCode = reportCode;
      let currentReportName = reportName;

      if (!reportId) {
        // Create new report
        currentReportCode = generateReportCode();
        currentReportName = `Fire Report ${new Date().toLocaleDateString()}`;
        
        const { data: newReport, error: reportError } = await supabase
          .from("fire_reports")
          .insert([{
            report_code: currentReportCode,
            report_name: currentReportName,
            lat: parseFloat(formData.lat),
            lon: parseFloat(formData.lon),
            created_by: user?.id,
            simulation_params: JSON.parse(JSON.stringify({
              ...formData,
              lat: parseFloat(formData.lat),
              lon: parseFloat(formData.lon),
            })),
            simulation_result: JSON.parse(JSON.stringify(response)),
          }])
          .select()
          .single();

        if (reportError) throw reportError;
        currentReportId = newReport.id;
        setReportId(newReport.id);
        setReportCode(currentReportCode);
        setReportName(currentReportName);
      }

      // Save zone data
      const { error: zoneError } = await supabase
        .from("report_zones")
        .insert({
          report_id: currentReportId,
          zone_name: selectedZone,
          firebreak_area_m2: response.summary.firebreak.area_m2,
        });

      if (zoneError) throw zoneError;

      setExistingZones((prev) => [...prev, selectedZone]);
      setReportSaved(true);
      toast({ title: "Simulation complete", description: `Report ${currentReportCode} saved` });
    } catch (error) {
      console.error("Simulation error:", error);
      toast({ title: "Simulation failed", variant: "destructive" });
    } finally {
      setIsSimulating(false);
    }
  };

  const handleSendNotification = async () => {
    if (!reportId || !result) return;

    setIsSendingNotification(true);
    try {
      // Get all other users from public_profiles (security: no email exposed)
      const { data: profiles } = await supabase
        .from("public_profiles")
        .select("id")
        .neq("id", user?.id || "");

      if (profiles && profiles.length > 0) {
        const notifications = profiles.map((profile) => ({
          user_id: profile.id,
          sender_id: user?.id,
          report_id: reportId,
          title: `New Fire Report: ${reportCode}`,
          message: `Zone ${selectedZone} - Firebreak: ${result.summary.firebreak.area_m2.toLocaleString()} m², Burned: ${result.summary.burned.area_m2.toLocaleString()} m²`,
          type: "alert",
        }));

        const { error } = await supabase.from("notifications").insert(notifications);
        if (error) throw error;
      }

      toast({ title: "Notifications sent", description: "All users have been notified" });
    } catch (error) {
      console.error("Notification error:", error);
      toast({ title: "Failed to send notifications", variant: "destructive" });
    } finally {
      setIsSendingNotification(false);
    }
  };

  const handleResourceAllocation = () => {
    if (!result || !reportId) return;
    navigate("/resource-allocation", {
      state: {
        reportId,
        reportCode,
        reportName,
        zone: selectedZone,
        firebreakArea: result.summary.firebreak.area_m2,
        burnedArea: result.summary.burned.area_m2,
        lat: parseFloat(formData.lat),
        lon: parseFloat(formData.lon),
        simulationParams: { ...formData },
        simulationResult: result,
      },
    });
  };

  const resultCards = result ? [
    { label: "Unburned", value: result.summary.unburned.area_m2, icon: TreeDeciduous, color: "text-success" },
    { label: "Burning", value: result.summary.burning.area_m2, icon: Flame, color: "text-warning" },
    { label: "Burned", value: result.summary.burned.area_m2, icon: Square, color: "text-destructive" },
    { label: "Firebreak", value: result.summary.firebreak.area_m2, icon: Shield, color: "text-info" },
  ] : [];

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Fire Simulation</h1>
            <p className="text-sm text-muted-foreground">
              {continueState?.continueReport ? "Add zone to existing report" : "Calculate burn area and allocate resources"}
            </p>
          </div>
          {reportCode && (
            <Badge variant="secondary" className="flex items-center gap-1 w-fit">
              <FileText className="h-3 w-3" />
              {reportCode}
            </Badge>
          )}
        </div>

        {/* Existing Zones Warning */}
        {existingZones.length > 0 && (
          <Card className="border-warning/50 bg-warning/5">
            <CardContent className="p-4">
              <p className="text-sm font-medium">Existing zones in this report:</p>
              <div className="flex gap-2 mt-2 flex-wrap">
                {existingZones.map((z) => (
                  <Badge key={z} variant="secondary">Zone {z}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 1: Fire Simulation Form */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <span className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm">1</span>
            Fire Simulation
          </h2>
          
          <div className="grid lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <MapPin className="h-4 w-4" /> Location
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button onClick={detectLocation} variant="outline" className="w-full" disabled={isLocating} size="sm">
                  {isLocating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Navigation className="mr-2 h-4 w-4" />}
                  Detect GPS Location
                </Button>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Latitude</Label>
                    <Input value={formData.lat} onChange={(e) => setFormData({ ...formData, lat: e.target.value })} placeholder="18.7883" className="h-9" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Longitude</Label>
                    <Input value={formData.lon} onChange={(e) => setFormData({ ...formData, lon: e.target.value })} placeholder="98.9853" className="h-9" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Parameters</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Year</Label>
                    <Select value={formData.year} onValueChange={(v) => setFormData({ ...formData, year: v })}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {[2024, 2025].map((y) => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Month</Label>
                    <Select value={formData.month} onValueChange={(v) => setFormData({ ...formData, month: v })}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 12 }, (_, i) => <SelectItem key={i + 1} value={(i + 1).toString()}>{i + 1}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Day</Label>
                    <Select value={formData.day} onValueChange={(v) => setFormData({ ...formData, day: v })}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 31 }, (_, i) => <SelectItem key={i + 1} value={(i + 1).toString()}>{i + 1}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Grid X</Label>
                    <Select value={formData.grid_x} onValueChange={(v) => setFormData({ ...formData, grid_x: v })}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {[25, 50, 100].map((v) => <SelectItem key={v} value={v.toString()}>{v}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Grid Y</Label>
                    <Select value={formData.grid_y} onValueChange={(v) => setFormData({ ...formData, grid_y: v })}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {[25, 50, 100].map((v) => <SelectItem key={v} value={v.toString()}>{v}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Duration</Label>
                    <Input type="number" value={formData.sim_minutes} onChange={(e) => setFormData({ ...formData, sim_minutes: e.target.value })} className="h-9" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Select Zone</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Select value={selectedZone} onValueChange={(v) => setSelectedZone(v as ZoneType)}>
                <SelectTrigger className="w-full sm:w-64">
                  <SelectValue placeholder="Select a zone..." />
                </SelectTrigger>
                <SelectContent>
                  {(["A", "B", "C"] as ZoneType[]).map((zone) => (
                    <SelectItem key={zone} value={zone} disabled={existingZones.includes(zone)}>
                      Zone {zone} {existingZones.includes(zone) && "(Already added)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {selectedZone && (
                <div className="rounded-lg overflow-hidden border border-border">
                  <img 
                    src={selectedZone === "A" ? zoneAMap : selectedZone === "B" ? zoneBMap : zoneCMap} 
                    alt={`Zone ${selectedZone} map`} 
                    className="w-full h-auto object-cover max-h-48"
                  />
                  <div className="p-2 bg-muted/50">
                    <p className="text-sm font-medium">Zone {selectedZone} Coverage Area</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Photo Upload */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Image className="h-4 w-4" /> Upload Photo (Optional)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Label 
                htmlFor="burned-photo-upload" 
                className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
              >
                <Upload className="h-6 w-6 text-muted-foreground mb-1" />
                <span className="text-xs text-muted-foreground">Click to upload</span>
                <Input id="burned-photo-upload" type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
              </Label>

              {burnedAreaPhoto && (
                <div className="mt-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs">{photoFileName}</span>
                    <Button variant="ghost" size="sm" onClick={removePhoto} className="text-destructive h-7 px-2">
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                  <img src={burnedAreaPhoto} alt="Uploaded" className="w-full h-auto max-h-32 object-cover rounded-lg" />
                </div>
              )}
            </CardContent>
          </Card>

          <Button onClick={handleSimulate} className="w-full h-12 text-base" disabled={isSimulating || !selectedZone}>
            {isSimulating ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Calculating...</> : <><Flame className="mr-2 h-5 w-5" />Calculate Burned Area</>}
          </Button>
        </div>

        {/* Step 2: Results */}
        {result && (
          <>
            <Separator className="my-4" />
            <div className="space-y-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <span className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm">2</span>
                Results
              </h2>

              <Card>
                <CardHeader className="pb-2 flex flex-row items-center gap-3">
                  <Wind className="h-5 w-5 text-info" />
                  <div>
                    <CardTitle className="text-base">Wind Conditions</CardTitle>
                    <p className="text-xs text-muted-foreground">
                      Speed: {result.wind_speed.toFixed(1)} m/s | Direction: {result.wind_direction.toFixed(0)}°
                    </p>
                  </div>
                </CardHeader>
              </Card>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {resultCards.map((card) => (
                  <Card key={card.label}>
                    <CardContent className="p-3">
                      <div className="flex items-center gap-2">
                        <card.icon className={cn("h-5 w-5 shrink-0", card.color)} />
                        <div className="min-w-0">
                          <p className="text-lg font-bold truncate">{card.value.toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground">{card.label} m²</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button onClick={handleSendNotification} variant="outline" className="flex-1" disabled={isSendingNotification}>
                  {isSendingNotification ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Sending...</>
                  ) : (
                    <><Bell className="mr-2 h-4 w-4" />Send Notification</>
                  )}
                </Button>
                <Button onClick={handleResourceAllocation} className="flex-1">
                  <Calculator className="mr-2 h-4 w-4" />
                  Resource Allocation
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </MainLayout>
  );
}
