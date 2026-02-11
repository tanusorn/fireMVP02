import { Clock, Loader2, AlertTriangle, Info, LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Notification } from "@/api/notifications";

const typeIcons: Record<string, LucideIcon> = {
  alert: AlertTriangle,
  info: Info,
  warning: AlertTriangle,
};

const typeColors: Record<string, string> = {
  alert: "text-destructive bg-destructive/10",
  info: "text-info bg-info/10",
  warning: "text-warning bg-warning/10",
};

interface NotificationCardProps {
  notification: Notification;
  isUpdating: boolean;
  onMarkAsRead: (id: string) => void;
}

export function NotificationCard({
  notification,
  isUpdating,
  onMarkAsRead,
}: NotificationCardProps) {
  const Icon = typeIcons[notification.type] || Info;

  return (
    <Card
      className={cn(
        "transition-all",
        !notification.read &&
          "border-primary/50 bg-primary/5 cursor-pointer hover:bg-primary/10",
        isUpdating && "opacity-50 pointer-events-none"
      )}
      onClick={() =>
        !notification.read && !isUpdating && onMarkAsRead(notification.id)
      }
    >
      <CardContent className="p-3 sm:p-4">
        <div className="flex gap-2.5 sm:gap-4">
          {/* Icon */}
          <div
            className={cn(
              "p-1.5 sm:p-2 rounded-lg h-fit shrink-0",
              typeColors[notification.type] || "text-muted-foreground bg-muted"
            )}
          >
            {isUpdating ? (
              <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
            ) : (
              <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 space-y-0.5 sm:space-y-1">
            {/* Title row with badge */}
            <div className="flex items-start gap-2">
              <p
                className={cn(
                  "text-sm sm:text-base leading-tight flex-1 min-w-0",
                  !notification.read
                    ? "font-semibold text-foreground"
                    : "font-medium"
                )}
              >
                {notification.title}
              </p>
              {!notification.read && (
                <Badge
                  variant="default"
                  className="shrink-0 text-[10px] sm:text-xs px-1.5 sm:px-2.5 py-0 sm:py-0.5"
                >
                  ใหม่
                </Badge>
              )}
            </div>

            {/* Message */}
            <p className="text-xs sm:text-sm text-muted-foreground leading-snug line-clamp-2">
              {notification.message}
            </p>

            {/* Timestamp */}
            <p className="text-[10px] sm:text-xs text-muted-foreground flex items-center gap-1 pt-0.5">
              <Clock className="h-3 w-3 shrink-0" />
              <span className="truncate">
                {new Date(notification.created_at).toLocaleString("th-TH", {
                  dateStyle: "short",
                  timeStyle: "short",
                })}
              </span>
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
