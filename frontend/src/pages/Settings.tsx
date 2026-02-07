import { useState, useRef } from "react";
import MainLayout from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { User, Moon, Sun, Shield, Bell, Camera, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function Settings() {
  const { user, profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [isDark, setIsDark] = useState(!document.documentElement.classList.contains("light"));
  const [notifications, setNotifications] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profileData, setProfileData] = useState({
    name: profile?.name || "",
    email: profile?.email || "",
  });

  const toggleTheme = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle("light");
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({ title: "ไฟล์ไม่ถูกต้อง", description: "กรุณาเลือกไฟล์รูปภาพ", variant: "destructive" });
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "ไฟล์ใหญ่เกินไป", description: "กรุณาเลือกรูปภาพขนาดไม่เกิน 2MB", variant: "destructive" });
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/avatar.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: `${publicUrl}?t=${Date.now()}` })
        .eq('id', user.id);

      if (updateError) throw updateError;

      await refreshProfile();
      toast({ title: "อัปเดตรูปโปรไฟล์สำเร็จ", description: "รูปโปรไฟล์ของคุณถูกเปลี่ยนแล้ว" });
    } catch (error: any) {
      toast({ title: "อัปโหลดไม่สำเร็จ", description: error.message, variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ name: profileData.name })
        .eq('id', user.id);

      if (error) throw error;

      await refreshProfile();
      toast({ title: "บันทึกการตั้งค่าสำเร็จ", description: "การตั้งค่าของคุณถูกอัปเดตแล้ว" });
    } catch (error: any) {
      toast({ title: "บันทึกไม่สำเร็จ", description: error.message, variant: "destructive" });
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto space-y-4 sm:space-y-6 px-2 sm:px-0 animate-fade-in">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">การตั้งค่า</h1>
          <p className="text-sm sm:text-base text-muted-foreground">จัดการบัญชีและการตั้งค่าของคุณ</p>
        </div>

        {/* Profile Settings */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <User className="h-4 w-4 sm:h-5 sm:w-5" /> ข้อมูลโปรไฟล์
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">อัปเดตข้อมูลส่วนตัวของคุณ</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 sm:space-y-6">
            {/* Avatar Upload */}
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="relative group">
                <Avatar className="h-20 w-20 sm:h-24 sm:w-24 border-2 border-border">
                  <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.name} />
                  <AvatarFallback className="text-lg sm:text-xl bg-primary/10 text-primary">
                    {getInitials(profile?.name || "U")}
                  </AvatarFallback>
                </Avatar>
                <button
                  onClick={handleAvatarClick}
                  disabled={isUploading}
                  className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer disabled:cursor-not-allowed"
                >
                  {isUploading ? (
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  ) : (
                    <Camera className="h-6 w-6 text-primary" />
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
              </div>
              <div className="text-center sm:text-left">
                <p className="font-medium text-sm sm:text-base">{profile?.name}</p>
                <p className="text-xs sm:text-sm text-muted-foreground">{profile?.email}</p>
                <Button 
                  variant="link" 
                  className="h-auto p-0 text-xs sm:text-sm" 
                  onClick={handleAvatarClick}
                  disabled={isUploading}
                >
                  เปลี่ยนรูปโปรไฟล์
                </Button>
              </div>
            </div>

            <div className="space-y-3 sm:space-y-4">
              <div className="space-y-1.5 sm:space-y-2">
                <Label className="text-xs sm:text-sm">ชื่อ-นามสกุล</Label>
                <Input
                  value={profileData.name}
                  onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                  className="h-10 sm:h-11 text-sm"
                />
              </div>
              <div className="space-y-1.5 sm:space-y-2">
                <Label className="text-xs sm:text-sm">Email</Label>
                <Input
                  type="email"
                  value={profileData.email}
                  disabled
                  className="h-10 sm:h-11 text-sm bg-muted"
                />
                <p className="text-xs text-muted-foreground">ไม่สามารถเปลี่ยน Email ได้</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Appearance */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              {isDark ? <Moon className="h-4 w-4 sm:h-5 sm:w-5" /> : <Sun className="h-4 w-4 sm:h-5 sm:w-5" />}
              รูปลักษณ์
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">ปรับแต่งการแสดงผลของ FireWatch</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm sm:text-base">โหมดมืด</p>
                <p className="text-xs sm:text-sm text-muted-foreground truncate">ใช้ธีมสีเข้มสำหรับหน้าจอ</p>
              </div>
              <Switch checked={isDark} onCheckedChange={toggleTheme} />
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Bell className="h-4 w-4 sm:h-5 sm:w-5" /> การแจ้งเตือน
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">ตั้งค่าการแจ้งเตือน</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm sm:text-base">การแจ้งเตือนแบบพุช</p>
                <p className="text-xs sm:text-sm text-muted-foreground truncate">รับการแจ้งเตือนเมื่อมีเหตุการณ์ใหม่</p>
              </div>
              <Switch checked={notifications} onCheckedChange={setNotifications} />
            </div>
          </CardContent>
        </Card>

        {/* Security */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Shield className="h-4 w-4 sm:h-5 sm:w-5" /> ความปลอดภัย
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">จัดการความปลอดภัยของบัญชี</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4">
            <div className="space-y-1.5 sm:space-y-2">
              <Label className="text-xs sm:text-sm">รหัสผ่านปัจจุบัน</Label>
              <Input type="password" placeholder="••••••••" className="h-10 sm:h-11 text-sm" />
            </div>
            <div className="space-y-1.5 sm:space-y-2">
              <Label className="text-xs sm:text-sm">รหัสผ่านใหม่</Label>
              <Input type="password" placeholder="••••••••" className="h-10 sm:h-11 text-sm" />
            </div>
          </CardContent>
        </Card>

        <Button onClick={handleSave} className="w-full h-11 sm:h-12 text-sm sm:text-base glow-primary">
          บันทึกการเปลี่ยนแปลง
        </Button>
      </div>
    </MainLayout>
  );
}
