import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { Friend } from "@/types";
import { getCommonOutings } from "@/lib/friends";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

interface FriendCardProps {
  friend: Friend;
  balance: number;
  outings: Parameters<typeof getCommonOutings>[1];
  currentUserId: string;
  onClick: () => void;
}

export function FriendCard({
  friend,
  balance,
  outings,
  currentUserId,
  onClick,
}: FriendCardProps) {
  const commonCount = getCommonOutings(friend, outings, currentUserId).length;
  const isSettled = Math.abs(balance) < 0.01;
  const theyOweYou = balance > 0;

  return (
    <motion.button
      type="button"
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      onClick={onClick}
      className="w-full fintech-card-hover p-4 text-left transition-all active:scale-[0.99]"
    >
      <div className="flex items-start gap-3">
        <Avatar className="h-11 w-11 border border-border/60 shrink-0">
          <AvatarFallback seed={friend.id} className="bg-primary/10 text-primary font-medium">{friend.name.charAt(0)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-foreground truncate">{friend.name}</p>
          <p className="text-sm text-muted-foreground truncate">{friend.email}</p>

          <div className="flex items-center justify-between gap-3 mt-3">
            <span className="text-sm text-muted-foreground">
              {commonCount === 0
                ? "No outings together"
                : `${commonCount} ${commonCount === 1 ? "Outing" : "Outings"} together`}
            </span>
            <span
              className={cn(
                "text-sm font-semibold shrink-0 px-2.5 py-1 rounded-lg",
                isSettled && "bg-muted text-muted-foreground",
                theyOweYou && !isSettled && "bg-success/15 text-success",
                !theyOweYou && !isSettled && "bg-destructive/15 text-destructive"
              )}
            >
              {isSettled ? "Settled" : formatCurrency(Math.abs(balance))}
            </span>
          </div>
        </div>
        <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0 mt-1" />
      </div>
    </motion.button>
  );
}