import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import MainLayout from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Users, Wrench, User, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOperationCenters } from "@/hooks/useOperationCenters";

interface Officer {
  id: string;
  name: string;
  avatar_url: string | null;
  current_status: "available" | "unavailable";
}

interface Equipment {
  id: string;
  equipment_type: string;
  quantity: number;
}

export default function OperationCenterDetail() {
  const { centerId } = useParams<{ centerId: string }>();
  const navigate = useNavigate();
  const { centers: operationCenters, isLoading: centersLoading } = useOperationCenters();
  const [officers, setOfficers] = useState<Officer[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [centerName, setCenterName] = useState<string>("");

  useEffect(() => {
    if (centersLoading) return;
    
    const validCenter = operationCenters.find((c) => c.code === centerId);
    if (!validCenter) {
      navigate("/operation-centers");
      return;
    }
    
    setCenterName(validCenter.name);
    fetchCenterData();
  }, [centerId, navigate, centersLoading, operationCenters]);

  const fetchCenterData = async () => {
    try {
      // Fetch officers from public_profiles (security: no email exposed)
      const { data: profilesData } = await supabase
        .from("public_profiles")
        .select("id, name, avatar_url, current_status")
        .eq("operation_center", centerId);

      // Fetch equipment
      const { data: equipmentData } = await supabase
        .from("equipment")
        .select("id, equipment_type, quantity")
        .eq("operation_center", centerId);

      setOfficers((profilesData as Officer[]) || []);
      setEquipment((equipmentData as Equipment[]) || []);
    } catch (error) {
      console.error("Error fetching center data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const availableCount = officers.filter((o) => o.current_status === "available").length;
  if (isLoading || centersLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-4 sm:space-y-6 animate-fade-in px-1 sm:px-0">
        <div className="flex items-center gap-3 sm:gap-4">
          <Button variant="ghost" size="icon" className="shrink-0 h-9 w-9 sm:h-10 sm:w-10" onClick={() => navigate("/operation-centers")}>
            <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-2xl font-bold truncate">{centerName}</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              {officers.length} Officers • {availableCount} Available
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
          {/* Officers List */}
          <Card>
            <CardHeader className="pb-3 sm:pb-4">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Users className="h-4 w-4 sm:h-5 sm:w-5" />
                Officers ({officers.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 sm:px-6">
              {officers.length === 0 ? (
                <p className="text-muted-foreground text-center py-6 sm:py-8 text-sm">
                  No officers assigned to this center
                </p>
              ) : (
                <div className="space-y-3 sm:space-y-4">
                  {officers.map((officer) => (
                    <div
                      key={officer.id}
                      className="flex items-center gap-3 sm:gap-4 p-2.5 sm:p-3 rounded-lg bg-muted/30"
                    >
                      <Avatar className="h-10 w-10 sm:h-12 sm:w-12 shrink-0">
                        <AvatarImage src={officer.avatar_url || undefined} />
                        <AvatarFallback>
                          <User className="h-5 w-5 sm:h-6 sm:w-6" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm sm:text-base truncate">{officer.name}</p>
                      </div>
                      <Badge
                        variant={officer.current_status === "available" ? "default" : "secondary"}
                        className="shrink-0 text-xs"
                      >
                        {officer.current_status === "available" ? "Available" : "Unavailable"}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Equipment Summary */}
          <Card>
            <CardHeader className="pb-3 sm:pb-4">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Wrench className="h-4 w-4 sm:h-5 sm:w-5" />
                Equipment
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 sm:px-6">
              {equipment.length === 0 ? (
                <p className="text-muted-foreground text-center py-6 sm:py-8 text-sm">
                  No equipment assigned to this center
                </p>
              ) : (
                <div className="space-y-3 sm:space-y-4">
                  {equipment.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-2.5 sm:p-3 rounded-lg bg-muted/30"
                    >
                      <span className="font-medium text-sm sm:text-base capitalize">{item.equipment_type}</span>
                      <Badge variant="outline" className="text-sm sm:text-lg font-bold shrink-0">
                        {item.quantity}
                      </Badge>
                    </div>
                  ))}
                  <Separator />
                  <div className="flex items-center justify-between text-muted-foreground text-xs sm:text-sm">
                    <span>Total Equipment Types</span>
                    <span className="font-bold">{equipment.length}</span>
                  </div>
                  <div className="flex items-center justify-between text-muted-foreground text-xs sm:text-sm">
                    <span>Total Items</span>
                    <span className="font-bold">
                      {equipment.reduce((sum, e) => sum + e.quantity, 0)}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}