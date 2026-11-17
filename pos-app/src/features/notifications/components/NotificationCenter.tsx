import { Bell, CheckCheck, Package, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  selectUnreadCount,
  useNotificationStore,
} from "../store/notificationStore";

function timeAgo(timestamp: number) {
  const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(timestamp).toLocaleDateString();
}

/** Bell button with unread badge and a list of recent notifications. Put it in your header. */
export default function NotificationCenter() {
  const notifications = useNotificationStore((state) => state.notifications);
  const unread = useNotificationStore(selectUnreadCount);
  const { markRead, markAllRead, remove, clear } = useNotificationStore();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
        >
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <Badge
              variant="destructive"
              className="absolute -right-1 -top-1 h-5 min-w-5 justify-center rounded-full px-1 text-[10px]"
            >
              {unread > 9 ? "9+" : unread}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 className="text-sm font-semibold">Notifications</h3>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={markAllRead}
              disabled={unread === 0}
              aria-label="Mark all as read"
              title="Mark all as read"
            >
              <CheckCheck className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={clear}
              disabled={notifications.length === 0}
              aria-label="Clear all"
              title="Clear all"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {notifications.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground">
            You're all caught up.
          </p>
        ) : (
          <ScrollArea className="h-80">
            <ul className="divide-y">
              {notifications.map((item) => (
                <li
                  key={item.id}
                  className={`group flex gap-3 px-4 py-3 ${item.read ? "" : "bg-primary/5"}`}
                >
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Package className="h-4 w-4" />
                  </div>
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left"
                    onClick={() => markRead(item.id)}
                  >
                    <p className="text-sm font-medium">{item.title}</p>
                    {item.description && (
                      <p className="text-xs text-muted-foreground">
                        {item.description}
                      </p>
                    )}
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {timeAgo(item.createdAt)}
                    </p>
                  </button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 focus:opacity-100"
                    onClick={() => remove(item.id)}
                    aria-label="Dismiss notification"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </li>
              ))}
            </ul>
          </ScrollArea>
        )}
      </PopoverContent>
    </Popover>
  );
}
