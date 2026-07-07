import { AlertTriangle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

interface BudgetCardProps {
  budget: number;
  totalSpent: number;
}

export function BudgetCard({ budget, totalSpent }: BudgetCardProps) {
  const usedPct = Math.min((totalSpent / budget) * 100, 100);
  const remaining = Math.max(budget - totalSpent, 0);
  const isExceeded = totalSpent > budget;
  const isWarning = !isExceeded && usedPct >= 85;
  const overBy = isExceeded ? totalSpent - budget : 0;

  return (
    <div
      className={cn(
        "fintech-card p-5 border-2 transition-colors",
        isExceeded && "border-destructive/50 bg-destructive/5",
        isWarning && "border-amber-500/40 bg-amber-500/5",
        !isExceeded && !isWarning && "border-border/60"
      )}
    >
      <div className="flex items-center justify-between mb-1">
        <p className="text-sm font-medium text-muted-foreground">Trip Budget</p>
        {isExceeded && (
          <span className="text-[10px] font-bold uppercase tracking-wide text-destructive flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" /> Over limit
          </span>
        )}
        {isWarning && !isExceeded && (
          <span className="text-[10px] font-bold uppercase tracking-wide text-amber-600 dark:text-amber-400">
            Almost full
          </span>
        )}
      </div>

      <p className={cn("text-2xl font-semibold", isExceeded && "text-destructive")}>
        {formatCurrency(budget)}
      </p>

      <div className="mt-3 space-y-2">
        <div className="flex justify-between text-[11px] mb-1">
          <span className={cn("text-muted-foreground", isExceeded && "text-destructive font-medium")}>
            {Math.round(usedPct)}% used · Spent {formatCurrency(totalSpent)}
          </span>
          <span className={cn(isExceeded ? "text-destructive font-semibold" : "text-muted-foreground")}>
            {isExceeded ? `Over by ${formatCurrency(overBy)}` : `${formatCurrency(remaining)} left`}
          </span>
        </div>
        <Progress
          value={usedPct}
          className={cn("h-2", isExceeded && "[&>div]:bg-destructive", isWarning && "[&>div]:bg-amber-500")}
        />
        {isExceeded && (
          <p className="text-xs font-semibold text-destructive">
            Budget exceeded — stop adding expenses
          </p>
        )}
      </div>
    </div>
  );
}