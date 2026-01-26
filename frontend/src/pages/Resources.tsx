import { useState, useEffect } from "react";
import MainLayout from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Save, Loader2, Package, Wrench, Pencil, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useOperationCenters } from "@/hooks/useOperationCenters";

interface EquipmentData {
  knife: number;
  rake: number;
  blower: number;
  torch: number;
}

const EQUIPMENT_TYPES = ["knife", "rake", "blower", "torch"] as const;

const EQUIPMENT_LABELS: Record<string, string> = {
  knife: "มีด",
  rake: "คราด",
  blower: "เครื่องเป่า",
  torch: "ไฟฉาย",
};

export default function Resources() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { centers: operationCenters, isLoading: centersLoading } = useOperationCenters();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [userCenter, setUserCenter] = useState<string | null>(null);
  const [equipment, setEquipment] = useState<Record<string, EquipmentData>>({});

  useEffect(() => {
    if (!centersLoading && operationCenters.length > 0) {
      loadData();
    }
  }, [user, centersLoading, operationCenters]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Get user's operation center
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("operation_center")
          .eq("id", user.id)
          .single();
        
        if (profile) {
          setUserCenter(profile.operation_center);
        }
      }

      // Load all equipment data
      const { data: equipmentData, error } = await supabase
        .from("equipment")
        .select("*");

      if (error) throw error;

      // Initialize equipment with all centers
      const newEquipment: Record<string, EquipmentData> = {};
      operationCenters.forEach((center) => {
        newEquipment[center.code] = { knife: 0, rake: 0, blower: 0, torch: 0 };
      });

      equipmentData?.forEach((item) => {
        const center = item.operation_center as string;
        const type = item.equipment_type as keyof EquipmentData;
        if (newEquipment[center] && EQUIPMENT_TYPES.includes(type)) {
          newEquipment[center][type] = item.quantity;
        }
      });

      setEquipment(newEquipment);
    } catch (error) {
      console.error("Error loading data:", error);
      toast({ title: "โหลดข้อมูลอุปกรณ์ไม่สำเร็จ", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const updateEquipment = (centerCode: string, type: keyof EquipmentData, value: number) => {
    setEquipment((prev) => ({
      ...prev,
      [centerCode]: { ...prev[centerCode], [type]: value },
    }));
  };

  const handleSave = async (centerCode: string) => {
    if (userCenter !== centerCode) {
      toast({ title: "ไม่มีสิทธิ์เข้าถึง", description: "คุณสามารถแก้ไขได้เฉพาะทรัพยากรของศูนย์ของคุณเท่านั้น", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    try {
      for (const type of EQUIPMENT_TYPES) {
        const { error } = await supabase
          .from("equipment")
          .upsert(
            {
              operation_center: centerCode,
              equipment_type: type,
              quantity: equipment[centerCode][type],
            },
            { onConflict: "operation_center,equipment_type" }
          );

        if (error) throw error;
      }

      toast({ title: "บันทึกอุปกรณ์สำเร็จ", description: `อัปเดตทรัพยากรของ ${centerCode} เรียบร้อยแล้ว` });
      setIsEditing(false);
    } catch (error) {
      console.error("Error saving equipment:", error);
      toast({ title: "บันทึกไม่สำเร็จ", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    loadData(); // Reload original data
  };

  const centerCodes = operationCenters.map((c) => c.code);

  if (isLoading || centersLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">จัดการทรัพยากร</h1>
          <p className="text-sm text-muted-foreground">
            จัดการคลังอุปกรณ์ของแต่ละศูนย์ปฏิบัติการ
          </p>
          {userCenter && (
            <Badge variant="secondary" className="mt-2">
              ศูนย์ของคุณ: {userCenter}
            </Badge>
          )}
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {operationCenters.map((center) => {
            const centerCode = center.code;
            const isUserCenter = userCenter === centerCode;
            const canEdit = isUserCenter && isEditing;
            const centerEquipment = equipment[centerCode] || { knife: 0, rake: 0, blower: 0, torch: 0 };
            return (
              <Card key={centerCode} className={!isUserCenter ? "opacity-75" : ""}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Package className="h-5 w-5" />
                      {center.name}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      {isUserCenter && !isEditing && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setIsEditing(true)}
                        >
                          <Pencil className="h-4 w-4 mr-1" />
                          แก้ไข
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    {EQUIPMENT_TYPES.map((type) => (
                      <div key={type} className="space-y-1">
                        <Label className="text-xs capitalize flex items-center gap-1">
                          <Wrench className="h-3 w-3" />
                          {EQUIPMENT_LABELS[type]}
                        </Label>
                        <Input
                          type="number"
                          min={0}
                          value={centerEquipment[type]}
                          onChange={(e) => updateEquipment(centerCode, type, parseInt(e.target.value) || 0)}
                          disabled={!canEdit}
                          className="h-9"
                        />
                      </div>
                    ))}
                  </div>

                  {isUserCenter && isEditing && (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={handleCancelEdit}
                        className="flex-1"
                        disabled={isSaving}
                      >
                        <X className="mr-2 h-4 w-4" />ยกเลิก
                      </Button>
                      <Button
                        onClick={() => handleSave(centerCode)}
                        className="flex-1"
                        disabled={isSaving}
                      >
                        {isSaving ? (
                          <><Loader2 className="mr-2 h-4 w-4 animate-spin" />กำลังบันทึก...</>
                        ) : (
                          <><Save className="mr-2 h-4 w-4" />บันทึก</>
                        )}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">สรุปอุปกรณ์</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3">ศูนย์</th>
                    {EQUIPMENT_TYPES.map((type) => (
                      <th key={type} className="text-center py-2 px-3">{EQUIPMENT_LABELS[type]}</th>
                    ))}
                    <th className="text-center py-2 px-3">รวม</th>
                  </tr>
                </thead>
                <tbody>
                  {operationCenters.map((center) => {
                    const centerEquipment = equipment[center.code] || { knife: 0, rake: 0, blower: 0, torch: 0 };
                    const total = EQUIPMENT_TYPES.reduce((sum, type) => sum + centerEquipment[type], 0);
                    return (
                      <tr key={center.code} className="border-b last:border-0">
                        <td className="py-2 px-3 font-medium">{center.name}</td>
                        {EQUIPMENT_TYPES.map((type) => (
                          <td key={type} className="text-center py-2 px-3">{centerEquipment[type]}</td>
                        ))}
                        <td className="text-center py-2 px-3 font-bold">{total}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
