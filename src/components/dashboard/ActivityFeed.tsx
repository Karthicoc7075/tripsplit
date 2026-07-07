import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export interface ActivityItem {
  id: string;
  text: string;
  time: string;
  type: "paid" | "added" | "settled" | "created";
}

const typeEmoji: Record<ActivityItem["type"], string> = {
  paid: "💰",
  added: "📝",
  settled: "✅",
  created: "🗺️",
};

interface ActivityFeedProps {
  items: ActivityItem[];
  title?: string;
  showViewAll?: boolean;
  className?: string;
  itemsClassName?: string;
}

export function ActivityFeed({
  items,
  title = "Recent Activity",
  showViewAll = true,
  className,
  itemsClassName,
}: ActivityFeedProps) {
  return (
    <div className={cn("fintech-card p-4 sm:p-6", className)}>
      <div className="flex items-center justify-between gap-2 mb-4 sm:mb-5">
        <h3 className="font-semibold text-foreground">{title}</h3>
        {showViewAll && (
          <Link
            to="/reports"
            className="text-xs sm:text-sm text-primary font-medium flex items-center gap-1 hover:underline shrink-0"
          >
            <span className="hidden sm:inline">View all activity</span>
            <span className="sm:hidden">View all</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>

      <div className={cn("space-y-4", itemsClassName)}>
        {items.map((activity, i) => (
          <motion.div
            key={activity.id}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.06 }}
            className="flex items-start gap-3 py-1"
          >
            <Avatar className="h-9 w-9 border border-border bg-surface-input shrink-0">
              <AvatarFallback className="text-xs bg-transparent">
                {typeEmoji[activity.type]}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0 border-b border-border/40 pb-4 last:border-0 last:pb-0">
              <p className="text-sm font-medium text-foreground leading-snug">{activity.text}</p>
              <p className="text-xs text-muted-foreground mt-1">{activity.time}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}