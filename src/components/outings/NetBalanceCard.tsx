import { TrendingDown, TrendingUp, CheckCircle } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { formatPayTo, formatReturnFrom } from "@/lib/displayNames";
import type { PersonalSpendingAnalysis } from "@/lib/outingAnalysis";
import { cn } from "@/lib/utils";

interface NetBalanceCardProps {
  analysis: PersonalSpendingAnalysis;
}

export function NetBalanceCard({ analysis }: NetBalanceCardProps) {
  const { netBalance } = analysis;

  const isSettled = Math.abs(netBalance) < 0.01;
  const isOwedByFriends = netBalance > 0.01;
  const youOwe = netBalance < -0.01;

  return (
    <div
      className={cn(
        "fintech-card p-4 sm:p-5 flex flex-col justify-center border transition-colors min-w-0 rounded-xl h-full",
        youOwe && "border-destructive/50 bg-destructive/5",
        isOwedByFriends && "border-success/40 bg-success/5",
        isSettled && "border-border/60"
      )}
    >
      <p className="text-sm font-medium text-muted-foreground mb-2">
        Net Balance
      </p>

      {isSettled ? (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-muted-foreground" />
            <p className="text-xl sm:text-2xl font-bold text-muted-foreground">{formatCurrency(0)}</p>
          </div>
          <p className="text-xs text-muted-foreground font-medium mt-1">All settled</p>
        </div>
      ) : youOwe ? (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5 text-destructive" />
            <p className="text-xl sm:text-2xl font-bold text-destructive">
              - {formatCurrency(Math.abs(netBalance))}
            </p>
          </div>
          <p className="text-sm font-semibold text-destructive">
            {formatPayTo(Math.abs(netBalance))}
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-success" />
            <p className="text-xl sm:text-2xl font-bold text-success">
              + {formatCurrency(netBalance)}
            </p>
          </div>
          <p className="text-sm font-semibold text-success">
            {formatReturnFrom(netBalance)}
          </p>
        </div>
      )}
    </div>
  );
}