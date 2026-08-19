import type { FriendsOverallSummary } from "@/lib/friends";
import { formatPersonOwes, formatPersonIsOwed } from "@/lib/displayNames";
import { cn } from "@/lib/utils";

interface FriendsSummaryBarProps {
  summary: FriendsOverallSummary;
  userName: string;
}

export function FriendsSummaryBar({ summary, userName }: FriendsSummaryBarProps) {
  const { netBalance } = summary;
  const isPositive = netBalance > 0.01;
  const isNegative = netBalance < -0.01;
  const isSettled = !isPositive && !isNegative;

  return (
    <div
      className={cn(
        "fintech-card px-4 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-3",
        isPositive && "border-success/30",
        isNegative && "border-destructive/30"
      )}
    >
      <span className="text-sm text-muted-foreground">Net balance</span>
      <span
        className={cn(
          "text-sm font-semibold",
          isSettled && "text-muted-foreground",
          isPositive && "text-success",
          isNegative && "text-destructive"
        )}
      >
        {isSettled
          ? "All settled"
          : isPositive
            ? formatPersonIsOwed(userName, netBalance)
            : formatPersonOwes(userName, Math.abs(netBalance))}
      </span>
    </div>
  );
}