import { ChevronRight, Receipt } from "lucide-react";
import { formatCurrency } from "@/lib/format";

function formatTxDateTime(tx: Transaction): string {
  const created = new Date(tx.createdAt);
  const time =
    !Number.isNaN(created.getTime())
      ? created.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })
      : null;
  return time ? `${tx.date} · ${time}` : tx.date;
}
import type { Transaction } from "@/types";
import { cn } from "@/lib/utils";

interface TransactionListProps {
  transactions: Transaction[];
  currentUserId: string;
  onSelect: (tx: Transaction) => void;
}

function isUserInvolved(tx: Transaction, userId: string): boolean {
  const paid =
    tx.paidById === userId ||
    tx.payments?.some((p) => p.memberId === userId);
  const inSplit = tx.splits.some((s) => s.memberId === userId);
  return paid || inSplit;
}

export function TransactionList({
  transactions,
  currentUserId,
  onSelect,
}: TransactionListProps) {
  return (
    <div className="divide-y divide-border/50">
      {transactions.map((tx) => {
        const involved = isUserInvolved(tx, currentUserId);

        return (
          <button
            key={tx.id}
            type="button"
            onClick={() => onSelect(tx)}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-4 sm:px-5 text-left",
              "hover:bg-muted/40 active:bg-muted/60 transition-colors",
              involved && "bg-primary/[0.03]"
            )}
          >
            <div
              className={cn(
                "h-10 w-10 rounded-xl flex items-center justify-center shrink-0",
                involved ? "bg-primary/15" : "bg-primary/10"
              )}
            >
              <Receipt className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground truncate">{tx.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                {formatTxDateTime(tx)}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="font-semibold text-foreground">
                {formatCurrency(tx.amount)}
              </span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </button>
        );
      })}
    </div>
  );
}