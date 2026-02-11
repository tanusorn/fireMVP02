// Notifications API - Using Supabase
import { supabase } from "@/integrations/supabase/client";

export interface Notification {
  id: string;
  user_id: string | null;
  title: string;
  message: string;
  type: string;
  read: boolean;
  created_at: string;
  report_id?: string | null;
  sender_id?: string | null;
}

// Get all notifications for current user (RLS handles filtering)
export async function getNotifications(): Promise<Notification[]> {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching notifications:", error);
    throw new Error(error.message);
  }

  return data || [];
}

// Get unread notification count
export async function getUnreadCount(): Promise<number> {
  const { count, error } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("read", false);

  if (error) {
    console.error("Error fetching unread count:", error);
    return 0;
  }

  return count || 0;
}

// Mark notification as read
export async function markAsRead(id: string): Promise<void> {
  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("id", id);

  if (error) {
    console.error("Error marking notification as read:", error);
    throw new Error(error.message);
  }
}

// Mark all notifications as read
export async function markAllAsRead(): Promise<void> {
  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("read", false);

  if (error) {
    console.error("Error marking all notifications as read:", error);
    throw new Error(error.message);
  }
}

// Delete all read notifications for current user
export async function deleteReadNotifications(): Promise<number> {
  const { data, error } = await supabase
    .from("notifications")
    .delete()
    .eq("read", true)
    .select();

  if (error) {
    console.error("Error deleting read notifications:", error);
    throw new Error(error.message);
  }

  return data?.length || 0;
}

// Send notification to a user
export async function sendNotification(
  userId: string,
  title: string,
  message: string,
  type: string = "info",
  reportId?: string
): Promise<void> {
  const { data: session } = await supabase.auth.getSession();
  const senderId = session?.session?.user?.id;

  if (!senderId) {
    throw new Error("Must be logged in to send notifications");
  }

  const { error } = await supabase.from("notifications").insert({
    user_id: userId,
    sender_id: senderId,
    title,
    message,
    type,
    report_id: reportId || null,
    read: false,
  });

  if (error) {
    console.error("Error sending notification:", error);
    throw new Error(error.message);
  }
}
