import { ArrowDownLeft, ArrowUpRight, ArrowRight } from "lucide-react";
import type { SettlementRecord } from "@/types";
import { formatCurrency, formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";

import { memberLabel } from "@/lib/displayNames";

interface SettlementHistoryProps {
  records: SettlementRecord[];
  currentUserId: string;
}

export function SettlementHistory({ records, currentUserId }: SettlementHistoryProps) {
  if (records.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-6">
        No settle or return payments recorded yet.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {records.map((record) => {
        const youReceived = record.toId === currentUserId;
        const youPaid = record.fromId === currentUserId;
        const isSettle = record.type === "settle";
        const fromName = memberLabel(record.fromName, record.fromId === currentUserId);
        const toName = memberLabel(record.toName, record.toId === currentUserId);

        let label = "";
        if (youReceived) {
          label = `You received ${formatCurrency(record.amount)} from ${fromName}`;
        } else if (youPaid) {
          label = isSettle
            ? `You paid ${formatCurrency(record.amount)} to ${toName}`
            : `You returned ${formatCurrency(record.amount)} to ${toName}`;
        } else {
          label = isSettle
            ? `${fromName} paid ${formatCurrency(record.amount)} to ${toName}`
            : `${fromName} returned ${formatCurrency(record.amount)} to ${toName}`;
        }

        return (
          <div
            key={record.id}
            className={cn(
              "flex items-center justify-between gap-3 p-4 rounded-xl border",
              youReceived && "bg-success/5 border-success/20",
              youPaid && "bg-destructive/5 border-destructive/20",
              !youReceived && !youPaid && "bg-muted/20 border-border/40"
            )}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={cn(
                  "h-9 w-9 rounded-full flex items-center justify-center shrink-0",
                  youReceived && "bg-success/15",
                  youPaid && "bg-destructive/15",
                  !youReceived && !youPaid && "bg-muted"
                )}
              >
                {youReceived && <ArrowDownLeft className="h-4 w-4 text-success" />}
                {youPaid && <ArrowUpRight className="h-4 w-4 text-destructive" />}
                {!youReceived && !youPaid && <ArrowRight className="h-4 w-4 text-muted-foreground" />}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{label}</p>
                <p className="text-xs text-muted-foreground">
                  {isSettle ? "Settle" : "Return"} · {formatRelativeTime(record.createdAt)}
                </p>
              </div>
            </div>
            <span
              className={cn(
                "text-sm font-semibold shrink-0",
                youReceived && "text-success",
                youPaid && "text-destructive",
                !youReceived && !youPaid && "text-foreground"
              )}
            >
              {youReceived && "+"}
              {youPaid && "-"}
              {formatCurrency(record.amount)}
            </span>
          </div>
        );
      })}
    </div>
  );
}