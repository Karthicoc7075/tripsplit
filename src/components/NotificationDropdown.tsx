import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useData } from "@/context/DataContext";
import {
  buildNotificationHistory,
  getUnreadCount,
  markNotificationsSeen,
} from "@/lib/notificationHistory";
import { cn } from "@/lib/utils";

export function NotificationDropdown() {
  const navigate = useNavigate();
  const { transactions, outings, friends, currentUserId, currentUserName } = useData();
  const [open, setOpen] = useState(false);
  const [seenVersion, setSeenVersion] = useState(0);
  const [clearedVersion, setClearedVersion] = useState(0);

  const notifications = useMemo(
    () => buildNotificationHistory(transactions, outings, friends, currentUserId, currentUserName),
    [transactions, outings, friends, currentUserId, currentUserName]
  );

  const clearedTime = useMemo(() => {
    const val = localStorage.getItem("tripsplit-notifications-cleared-at");
    return val ? new Date(val).getTime() : 0;
  }, [clearedVersion]);

  const visibleNotifications = useMemo(() => {
    return notifications.filter((n) => new Date(n.createdAt).getTime() > clearedTime);
  }, [notifications, clearedTime]);

  const unreadCount = useMemo(
    () => getUnreadCount(visibleNotifications),
    [visibleNotifications, seenVersion]
  );

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next && visibleNotifications.length > 0) {
      markNotificationsSeen(visibleNotifications);
      setSeenVersion((v) => v + 1);
    }
  };

  const handleSelect = (path: string) => {
    setOpen(false);
    navigate(path);
  };

  const handleClearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nowStr = new Date().toISOString();
    localStorage.setItem("tripsplit-notifications-cleared-at", nowStr);
    localStorage.setItem("tripsplit-notif-last-seen", nowStr);
    setClearedVersion((v) => v + 1);
    setSeenVersion((v) => v + 1);
  };

  return (
    <DropdownMenu open={open} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-9 w-9 text-muted-foreground">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 sm:w-96 p-0">
        <div className="flex items-center justify-between px-4 py-3">
          <span className="font-semibold text-sm">Notifications</span>
          {visibleNotifications.length > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
            >
              Clear All
            </button>
          )}
        </div>
        <DropdownMenuSeparator />
        {visibleNotifications.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
            <Receipt className="h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm font-medium text-foreground">No notifications yet</p>
            <p className="text-xs text-muted-foreground">
              New friends, outing invites, and expense activity will appear here.
            </p>
          </div>
        ) : (
          <ScrollArea className="max-h-80">
            <div className="py-1">
              {visibleNotifications.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelect(item.path)}
                  className={cn(
                    "flex w-full flex-col gap-0.5 px-4 py-3 text-left transition-colors",
                    "hover:bg-muted/50 focus-visible:outline-none focus-visible:bg-muted/50"
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-primary">{item.title}</span>
                    <span className="text-[11px] text-muted-foreground shrink-0">{item.time}</span>
                  </div>
                  <p className="text-sm text-foreground leading-snug line-clamp-2">{item.message}</p>
                </button>
              ))}
            </div>
          </ScrollArea>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}