import { Loader2, Trash2, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

interface NotificationHeaderProps {
  unreadCount: number;
  readCount: number;
  markingAll: boolean;
  deletingRead: boolean;
  onMarkAllAsRead: () => void;
  onDeleteRead: () => void;
}

export function NotificationHeader({
  unreadCount,
  readCount,
  markingAll,
  deletingRead,
  onMarkAllAsRead,
  onDeleteRead,
}: NotificationHeaderProps) {
  return (
    <div className="space-y-3 sm:space-y-0 sm:flex sm:items-center sm:justify-between">
      {/* Title section */}
      <div className="min-w-0">
        <h1 className="text-xl sm:text-2xl font-bold">การแจ้งเตือน</h1>
        <p className="text-sm text-muted-foreground">
          {unreadCount > 0
            ? `${unreadCount} การแจ้งเตือนที่ยังไม่ได้อ่าน`
            : "อ่านครบหมดแล้ว!"}
        </p>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 shrink-0">
        {unreadCount > 0 && (
          <>
            {/* Desktop: full button */}
            <Button
              variant="outline"
              size="sm"
              onClick={onMarkAllAsRead}
              disabled={markingAll}
              className="hidden sm:inline-flex h-9"
            >
              {markingAll ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCheck className="mr-2 h-4 w-4" />
              )}
              ทำเครื่องหมายว่าอ่านทั้งหมด
            </Button>
            {/* Mobile: icon only */}
            <Button
              variant="outline"
              size="icon"
              onClick={onMarkAllAsRead}
              disabled={markingAll}
              className="sm:hidden h-11 w-11"
              aria-label="ทำเครื่องหมายว่าอ่านทั้งหมด"
            >
              {markingAll ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <CheckCheck className="h-5 w-5" />
              )}
            </Button>
          </>
        )}

        {readCount > 0 && (
          <>
            {/* Desktop: full button */}
            <Button
              variant="outline"
              size="sm"
              onClick={onDeleteRead}
              disabled={deletingRead}
              className="hidden sm:inline-flex h-9 text-destructive hover:text-destructive"
            >
              {deletingRead ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              ลบที่อ่านแล้ว ({readCount})
            </Button>
            {/* Mobile: icon only */}
            <Button
              variant="outline"
              size="icon"
              onClick={onDeleteRead}
              disabled={deletingRead}
              className="sm:hidden h-11 w-11 text-destructive hover:text-destructive"
              aria-label={`ลบการแจ้งเตือนที่อ่านแล้ว ${readCount} รายการ`}
            >
              {deletingRead ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Trash2 className="h-5 w-5" />
              )}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
