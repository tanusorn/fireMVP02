import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import MainLayout from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Building2,
  Users,
  Wrench,
  ChevronRight,
  Loader2,
  Plus,
  Pencil,
  Trash2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOperationCenters } from "@/hooks/useOperationCenters";
import { useUserRole } from "@/hooks/useUserRole";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface CenterSummary {
  code: string;
  name: string;
  location?: string;
  description?: string;
  totalOfficers: number;
  availableOfficers: number;
  equipment: { type: string; quantity: number }[];
}

interface CenterFormData {
  code: string;
  name: string;
  location: string;
  latitude: string;
  longitude: string;
  description: string;
}

const EQUIPMENT_LABELS: Record<string, string> = {
  knife: "มีด",
  rake: "คราด",
  blower: "เครื่องเป่า",
  torch: "ไฟฉาย",
};

const initialFormData: CenterFormData = {
  code: "",
  name: "",
  location: "",
  latitude: "",
  longitude: "",
  description: "",
};

export default function OperationCenters() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const {
    centers: operationCentersList,
    isLoading: centersLoading,
    refetch,
  } = useOperationCenters();
  const { isAdmin, isLoading: roleLoading } = useUserRole();
  const [centerSummaries, setCenterSummaries] = useState<CenterSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Dialog states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedCenter, setSelectedCenter] = useState<string | null>(null);
  const [formData, setFormData] = useState<CenterFormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!centersLoading && operationCentersList.length > 0) {
      fetchCenterData();
    } else if (!centersLoading && operationCentersList.length === 0) {
      setIsLoading(false);
    }
  }, [centersLoading, operationCentersList]);

  const fetchCenterData = async () => {
    try {
      // Fetch public profiles for available officers count (security: no email exposed)
      const { data: profiles } = await supabase
        .from("public_profiles")
        .select("operation_center, current_status");

      // Fetch equipment
      const { data: equipment } = await supabase
        .from("equipment")
        .select("operation_center, equipment_type, quantity");

      // Fetch full center details including staff_count from database
      const { data: centerDetails } = await supabase
        .from("operation_centers")
        .select("code, name, location, description, staff_count");

      const summaries: CenterSummary[] = operationCentersList.map((center) => {
        const centerProfiles =
          profiles?.filter((p) => p.operation_center === center.code) || [];
        const centerEquipment =
          equipment?.filter((e) => e.operation_center === center.code) || [];
        const details = centerDetails?.find((c) => c.code === center.code);

        return {
          code: center.code,
          name: center.name,
          location: details?.location || undefined,
          description: details?.description || undefined,
          // Use staff_count from database (maintained by trigger)
          totalOfficers: details?.staff_count ?? 0,
          availableOfficers: centerProfiles.filter(
            (p) => p.current_status === "available",
          ).length,
          equipment: centerEquipment.map((e) => ({
            type: e.equipment_type,
            quantity: e.quantity,
          })),
        };
      });

      setCenterSummaries(summaries);
    } catch (error) {
      console.error("Error fetching center data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.code || !formData.name) {
      toast({ title: "กรุณากรอกข้อมูลที่จำเป็น", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("operation_centers").insert({
        code: formData.code,
        name: formData.name,
        location: formData.location || null,
        latitude: formData.latitude ? parseFloat(formData.latitude) : null,
        longitude: formData.longitude ? parseFloat(formData.longitude) : null,
        description: formData.description || null,
      });

      if (error) throw error;

      toast({ title: "สร้างศูนย์ปฏิบัติการสำเร็จ" });
      setIsCreateDialogOpen(false);
      setFormData(initialFormData);
      refetch();
    } catch (error: unknown) {
      console.error("Error creating center:", error);
      const errorMessage =
        error instanceof Error ? error.message : "เกิดข้อผิดพลาด";
      if (
        errorMessage.includes("permission") ||
        errorMessage.includes("policy")
      ) {
        toast({
          title: "ไม่มีสิทธิ์ดำเนินการ",
          description: "เฉพาะผู้ดูแลระบบเท่านั้นที่สามารถสร้างศูนย์ได้",
          variant: "destructive",
        });
      } else {
        toast({
          title: "เกิดข้อผิดพลาดในการสร้างศูนย์",
          variant: "destructive",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = async () => {
    if (!selectedCenter || !formData.name) {
      toast({ title: "กรุณากรอกข้อมูลที่จำเป็น", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("operation_centers")
        .update({
          name: formData.name,
          location: formData.location || null,
          latitude: formData.latitude ? parseFloat(formData.latitude) : null,
          longitude: formData.longitude ? parseFloat(formData.longitude) : null,
          description: formData.description || null,
        })
        .eq("code", selectedCenter);

      if (error) throw error;

      toast({ title: "แก้ไขศูนย์ปฏิบัติการสำเร็จ" });
      setIsEditDialogOpen(false);
      setFormData(initialFormData);
      setSelectedCenter(null);
      refetch();
    } catch (error: unknown) {
      console.error("Error updating center:", error);
      const errorMessage =
        error instanceof Error ? error.message : "เกิดข้อผิดพลาด";
      if (
        errorMessage.includes("permission") ||
        errorMessage.includes("policy")
      ) {
        toast({
          title: "ไม่มีสิทธิ์ดำเนินการ",
          description: "เฉพาะผู้ดูแลระบบเท่านั้นที่สามารถแก้ไขศูนย์ได้",
          variant: "destructive",
        });
      } else {
        toast({
          title: "เกิดข้อผิดพลาดในการแก้ไขศูนย์",
          variant: "destructive",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedCenter) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("operation_centers")
        .delete()
        .eq("code", selectedCenter);

      if (error) throw error;

      toast({ title: "ลบศูนย์ปฏิบัติการสำเร็จ" });
      setIsDeleteDialogOpen(false);
      setSelectedCenter(null);
      refetch();
    } catch (error: unknown) {
      console.error("Error deleting center:", error);
      const errorMessage =
        error instanceof Error ? error.message : "เกิดข้อผิดพลาด";
      if (
        errorMessage.includes("permission") ||
        errorMessage.includes("policy")
      ) {
        toast({
          title: "ไม่มีสิทธิ์ดำเนินการ",
          description: "เฉพาะผู้ดูแลระบบเท่านั้นที่สามารถลบศูนย์ได้",
          variant: "destructive",
        });
      } else {
        toast({ title: "เกิดข้อผิดพลาดในการลบศูนย์", variant: "destructive" });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditDialog = (center: CenterSummary, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedCenter(center.code);
    setFormData({
      code: center.code,
      name: center.name,
      location: center.location || "",
      latitude: "",
      longitude: "",
      description: center.description || "",
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (centerCode: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedCenter(centerCode);
    setIsDeleteDialogOpen(true);
  };

  if (isLoading || centersLoading || roleLoading) {
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
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">ศูนย์ปฏิบัติการ</h1>
            <p className="text-muted-foreground">ดูและจัดการศูนย์ปฏิบัติการ</p>
          </div>
          {isAdmin && (
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              สร้างศูนย์ใหม่
            </Button>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {centerSummaries.map((center) => (
            <Card
              key={center.code}
              className="cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => navigate(`/operation-centers/${center.code}`)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-primary" />
                    {center.name}
                  </CardTitle>
                  <div className="flex items-center gap-1">
                    {isAdmin && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => openEditDialog(center, e)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={(e) => openDeleteDialog(center.code, e)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      {center.totalOfficers} เจ้าหน้าที่
                    </span>
                  </div>
                  <Badge
                    variant={
                      center.availableOfficers > 0 ? "default" : "secondary"
                    }
                  >
                    {center.availableOfficers} พร้อมปฏิบัติงาน
                  </Badge>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Wrench className="h-4 w-4" />
                    อุปกรณ์
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {center.equipment.length > 0 ? (
                      center.equipment.map((eq) => (
                        <Badge
                          key={eq.type}
                          variant="outline"
                          className="text-xs"
                        >
                          {EQUIPMENT_LABELS[eq.type] || eq.type}: {eq.quantity}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        ไม่มีอุปกรณ์
                      </span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>สร้างศูนย์ปฏิบัติการใหม่</DialogTitle>
            <DialogDescription>
              กรอกข้อมูลสำหรับศูนย์ปฏิบัติการใหม่
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="code">รหัสศูนย์ *</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) =>
                  setFormData({ ...formData, code: e.target.value })
                }
                placeholder="เช่น K4"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="name">ชื่อศูนย์ *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="ศูนย์ปฏิบัติการ K4"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="location">ที่ตั้ง</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) =>
                  setFormData({ ...formData, location: e.target.value })
                }
                placeholder="ที่อยู่หรือตำแหน่ง"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="latitude">ละติจูด</Label>
                <Input
                  id="latitude"
                  type="number"
                  step="any"
                  value={formData.latitude}
                  onChange={(e) =>
                    setFormData({ ...formData, latitude: e.target.value })
                  }
                  placeholder="0.0"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="longitude">ลองจิจูด</Label>
                <Input
                  id="longitude"
                  type="number"
                  step="any"
                  value={formData.longitude}
                  onChange={(e) =>
                    setFormData({ ...formData, longitude: e.target.value })
                  }
                  placeholder="0.0"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">รายละเอียด</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="รายละเอียดเพิ่มเติม..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateDialogOpen(false)}
            >
              ยกเลิก
            </Button>
            <Button onClick={handleCreate} disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              สร้าง
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>แก้ไขศูนย์ปฏิบัติการ</DialogTitle>
            <DialogDescription>
              แก้ไขข้อมูลศูนย์ปฏิบัติการ {selectedCenter}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">ชื่อศูนย์ *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-location">ที่ตั้ง</Label>
              <Input
                id="edit-location"
                value={formData.location}
                onChange={(e) =>
                  setFormData({ ...formData, location: e.target.value })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-latitude">ละติจูด</Label>
                <Input
                  id="edit-latitude"
                  type="number"
                  step="any"
                  value={formData.latitude}
                  onChange={(e) =>
                    setFormData({ ...formData, latitude: e.target.value })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-longitude">ลองจิจูด</Label>
                <Input
                  id="edit-longitude"
                  type="number"
                  step="any"
                  value={formData.longitude}
                  onChange={(e) =>
                    setFormData({ ...formData, longitude: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-description">รายละเอียด</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
            >
              ยกเลิก
            </Button>
            <Button onClick={handleEdit} disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              บันทึก
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบศูนย์ปฏิบัติการ</AlertDialogTitle>
            <AlertDialogDescription>
              คุณแน่ใจหรือไม่ที่จะลบศูนย์ปฏิบัติการ {selectedCenter}?
              การดำเนินการนี้ไม่สามารถยกเลิกได้
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              ลบ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}
