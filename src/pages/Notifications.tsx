import { useEffect, useState, useCallback } from "react";
import MainLayout from "@/components/layout/MainLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Bell } from "lucide-react";
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteReadNotifications,
  Notification,
} from "@/api/notifications";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { NotificationCard } from "@/components/notifications/NotificationCard";
import { NotificationHeader } from "@/components/notifications/NotificationHeader";

export default function Notifications() {
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);
  const [deletingRead, setDeletingRead] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      const data = await getNotifications();
      setNotifications(data);
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถโหลดการแจ้งเตือนได้",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchNotifications();

    // Subscribe to realtime updates
    const channel = supabase
      .channel("notifications-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
        },
        () => {
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchNotifications]);

  const handleMarkAsRead = async (id: string) => {
    const notification = notifications.find((n) => n.id === id);
    if (!notification || notification.read) return;

    setUpdatingId(id);
    try {
      await markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
      toast({ title: "ทำเครื่องหมายว่าอ่านแล้ว" });
    } catch (error) {
      console.error("Failed to mark as read:", error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถอัปเดตสถานะได้",
        variant: "destructive",
      });
    } finally {
      setUpdatingId(null);
    }
  };

  const handleMarkAllAsRead = async () => {
    setMarkingAll(true);
    try {
      await markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      toast({ title: "ทำเครื่องหมายทั้งหมดว่าอ่านแล้ว" });
    } catch (error) {
      console.error("Failed to mark all as read:", error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถอัปเดตสถานะได้",
        variant: "destructive",
      });
    } finally {
      setMarkingAll(false);
    }
  };

  const handleDeleteRead = async () => {
    const readCount = notifications.filter((n) => n.read).length;
    if (readCount === 0) {
      toast({ title: "ไม่มีการแจ้งเตือนที่อ่านแล้ว" });
      return;
    }

    setDeletingRead(true);
    try {
      const deletedCount = await deleteReadNotifications();
      setNotifications((prev) => prev.filter((n) => !n.read));
      toast({ title: `ลบการแจ้งเตือนที่อ่านแล้ว ${deletedCount} รายการ` });
    } catch (error) {
      console.error("Failed to delete read notifications:", error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถลบการแจ้งเตือนได้",
        variant: "destructive",
      });
    } finally {
      setDeletingRead(false);
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;
  const readCount = notifications.filter((n) => n.read).length;

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto space-y-4 sm:space-y-6 animate-fade-in px-1 sm:px-0">
        <NotificationHeader
          unreadCount={unreadCount}
          readCount={readCount}
          markingAll={markingAll}
          deletingRead={deletingRead}
          onMarkAllAsRead={handleMarkAllAsRead}
          onDeleteRead={handleDeleteRead}
        />

        {isLoading ? (
          <div className="space-y-2 sm:space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-16 sm:h-20 bg-muted/50 rounded-lg animate-pulse"
              />
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <Card>
            <CardContent className="py-10 sm:py-12 text-center">
              <Bell className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 sm:mb-4 text-muted-foreground opacity-50" />
              <p className="text-sm sm:text-base text-muted-foreground">
                ยังไม่มีการแจ้งเตือน
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2 sm:space-y-3">
            {notifications.map((notif) => (
              <NotificationCard
                key={notif.id}
                notification={notif}
                isUpdating={updatingId === notif.id}
                onMarkAsRead={handleMarkAsRead}
              />
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
