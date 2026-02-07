import { useState, useEffect } from "react";
import MainLayout from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { CheckCircle, Clock, Loader2, Calendar, User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { th } from "date-fns/locale";

type UserStatus = "available" | "unavailable";

interface StatusHistory {
  id: string;
  status: UserStatus;
  date: string;
  created_at: string;
}

export default function DailyReport() {
  const { user, profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [selectedStatus, setSelectedStatus] = useState<UserStatus>("available");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [todayStatus, setTodayStatus] = useState<StatusHistory | null>(null);
  const [statusHistory, setStatusHistory] = useState<StatusHistory[]>([]);

  useEffect(() => {
    if (profile) {
      setSelectedStatus(profile.current_status);
      fetchStatusHistory();
    }
  }, [profile]);

  const fetchStatusHistory = async () => {
    if (!user) return;

    try {
      const today = format(new Date(), "yyyy-MM-dd");
      
      // Fetch today's status
      const { data: todayData } = await supabase
        .from("daily_status_history")
        .select("*")
        .eq("user_id", user.id)
        .eq("date", today)
        .maybeSingle();

      if (todayData) {
        setTodayStatus(todayData as StatusHistory);
        setSelectedStatus(todayData.status as UserStatus);
      }

      // Fetch recent history
      const { data: historyData } = await supabase
        .from("daily_status_history")
        .select("*")
        .eq("user_id", user.id)
        .order("date", { ascending: false })
        .limit(7);

      setStatusHistory((historyData as StatusHistory[]) || []);
    } catch (error) {
      console.error("Error fetching status history:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveStatus = async () => {
    if (!user) return;

    setIsSaving(true);
    try {
      const today = format(new Date(), "yyyy-MM-dd");

      // Upsert daily status history
      const { error: historyError } = await supabase
        .from("daily_status_history")
        .upsert(
          {
            user_id: user.id,
            status: selectedStatus,
            date: today,
          },
          { onConflict: "user_id,date" }
        );

      if (historyError) throw historyError;

      // Update profile current status
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ current_status: selectedStatus })
        .eq("id", user.id);

      if (profileError) throw profileError;

      await refreshProfile();
      await fetchStatusHistory();

      toast({
        title: "อัปเดตสถานะสำเร็จ",
        description: `สถานะของคุณถูกตั้งเป็น ${selectedStatus === "available" ? "พร้อมปฏิบัติงาน" : "ไม่พร้อมปฏิบัติงาน"}`,
      });
    } catch (error) {
      console.error("Error saving status:", error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถอัปเดตสถานะได้",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
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
      <div className="space-y-6 animate-fade-in max-w-2xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold">รายงานประจำวัน</h1>
          <p className="text-muted-foreground">อัปเดตสถานะความพร้อมของคุณ</p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  สถานะวันนี้
                </CardTitle>
                <CardDescription>
                  {format(new Date(), "EEEE d MMMM yyyy", { locale: th })}
                </CardDescription>
              </div>
              {todayStatus && (
                <Badge variant="outline" className="text-xs">
                  อัปเดตล่าสุด: {format(new Date(todayStatus.created_at), "HH:mm")}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/30">
              <User className="h-10 w-10 text-primary" />
              <div>
                <p className="font-medium">{profile?.name}</p>
                <p className="text-sm text-muted-foreground">{profile?.operation_center}</p>
              </div>
              <Badge
                className="ml-auto"
                variant={profile?.current_status === "available" ? "default" : "secondary"}
              >
                {profile?.current_status === "available" ? "พร้อมปฏิบัติงาน" : "ไม่พร้อมปฏิบัติงาน"}
              </Badge>
            </div>

            <Separator />

            <RadioGroup
              value={selectedStatus}
              onValueChange={(v) => setSelectedStatus(v as UserStatus)}
              className="grid grid-cols-2 gap-4"
            >
              <div>
                <RadioGroupItem value="available" id="available" className="peer sr-only" />
                <Label
                  htmlFor="available"
                  className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                >
                  <CheckCircle className="mb-3 h-8 w-8 text-success" />
                  <span className="font-semibold">พร้อมปฏิบัติงาน</span>
                  <span className="text-xs text-muted-foreground mt-1">พร้อมสำหรับภารกิจ</span>
                </Label>
              </div>
              <div>
                <RadioGroupItem value="unavailable" id="unavailable" className="peer sr-only" />
                <Label
                  htmlFor="unavailable"
                  className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                >
                  <Clock className="mb-3 h-8 w-8 text-muted-foreground" />
                  <span className="font-semibold">ไม่พร้อมปฏิบัติงาน</span>
                  <span className="text-xs text-muted-foreground mt-1">ไม่อยู่ในหน้าที่</span>
                </Label>
              </div>
            </RadioGroup>

            <Button
              onClick={handleSaveStatus}
              className="w-full h-12 glow-primary"
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  กำลังบันทึก...
                </>
              ) : (
                "บันทึกสถานะ"
              )}
            </Button>
          </CardContent>
        </Card>

        {statusHistory.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">ประวัติล่าสุด</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {statusHistory.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                  >
                    <span className="text-sm">
                      {format(new Date(entry.date), "EEE d MMM", { locale: th })}
                    </span>
                    <Badge variant={entry.status === "available" ? "default" : "secondary"}>
                      {entry.status === "available" ? "พร้อมปฏิบัติงาน" : "ไม่พร้อมปฏิบัติงาน"}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}
