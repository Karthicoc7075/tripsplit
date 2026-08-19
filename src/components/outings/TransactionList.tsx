import { useEffect, useMemo, useState } from "react";
import { ChevronRight, Search, X, CloudOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/format";
import { getTransactionDate } from "@/lib/dashboard";
import { getCategoryIcon } from "@/lib/identity";
import { getCategoryColor, type Transaction } from "@/types";
import { cn } from "@/lib/utils";
import { useData } from "@/context/DataContext";

interface TransactionListProps {
  transactions: Transaction[];
  currentUserId: string;
  onSelect: (tx: Transaction) => void;
}

function isUserInvolved(tx: Transaction, userId: string): boolean {
  const paid = tx.paidById === userId || tx.payments?.some((p) => p.memberId === userId);
  const inSplit = tx.splits.some((s) => s.memberId === userId);
  return paid || inSplit;
}

function formatTime(tx: Transaction): string | null {
  const created = new Date(tx.createdAt);
  return Number.isNaN(created.getTime())
    ? null
    : created.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** "Today" / "Yesterday" / "5 Aug 2026" — how people actually recall a spend. */
function dayLabel(date: Date): string {
  const today = startOfDay(new Date());
  const day = startOfDay(date);
  const diff = Math.round((today.getTime() - day.getTime()) / 86_400_000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return day.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: day.getFullYear() === today.getFullYear() ? undefined : "numeric",
  });
}

/** Renders in pages so a long trip does not mount hundreds of rows at once. */
const PAGE_SIZE = 25;

export function TransactionList({
  transactions,
  currentUserId,
  onSelect,
}: TransactionListProps) {
  const { pendingIds } = useData();
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return transactions;
    return transactions.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        (t.category ?? "").toLowerCase().includes(q) ||
        (t.description ?? "").toLowerCase().includes(q) ||
        t.paidByName.toLowerCase().includes(q) ||
        String(t.amount).includes(q)
    );
  }, [transactions, query]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [query]);

  const visible = filtered.slice(0, visibleCount);
  const remaining = filtered.length - visible.length;

  // Group the visible page by day so long trips stay navigable.
  const groups = useMemo(() => {
    const out: { label: string; items: Transaction[] }[] = [];
    for (const tx of visible) {
      const label = dayLabel(getTransactionDate(tx));
      const last = out[out.length - 1];
      if (last && last.label === label) last.items.push(tx);
      else out.push({ label, items: [tx] });
    }
    return out;
  }, [visible]);

  return (
    <div>
      {/* Outings and Friends both have search; a 60-expense trip had none. */}
      {transactions.length > 8 && (
        <div className="relative border-b border-border/50 p-3">
          <Search className="pointer-events-none absolute left-6 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search expenses, category, who paid…"
            className="h-10 pl-9 pr-9"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="absolute right-6 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      )}

      {filtered.length === 0 ? (
        <p className="px-4 py-10 text-center text-sm text-muted-foreground">
          No expenses match “{query}”.
        </p>
      ) : (
        groups.map((group) => (
          <section key={group.label}>
            <h4 className="sticky top-0 z-10 border-b border-border/40 bg-card/95 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground backdrop-blur sm:px-5">
              {group.label}
            </h4>

            <div className="divide-y divide-border/50">
              {group.items.map((tx) => {
                const involved = isUserInvolved(tx, currentUserId);
                const Icon = getCategoryIcon(tx.category);
                const accent = getCategoryColor(tx.category ?? "Other");
                const time = formatTime(tx);

                return (
                  <button
                    key={tx.id}
                    type="button"
                    onClick={() => onSelect(tx)}
                    className={cn(
                      "flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors sm:px-5",
                      "hover:bg-muted/40 active:bg-muted/60",
                      involved && "bg-primary/[0.03]"
                    )}
                  >
                    {/* getCategoryColor returns hsl() strings, so the tint is
                        mixed rather than hex-appended; bg-muted is the fallback
                        anywhere color-mix is unsupported. */}
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted"
                      style={{
                        backgroundColor: `color-mix(in srgb, ${accent} 14%, transparent)`,
                        color: accent,
                      }}
                    >
                      <Icon className="h-4 w-4" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-foreground">{tx.title}</p>
                      <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-muted-foreground">
                        {pendingIds.has(tx.id) && (
                          <CloudOff
                            className="h-3 w-3 shrink-0"
                            aria-label="Saved on this device, not yet synced"
                          />
                        )}
                        <span className="truncate">
                          {pendingIds.has(tx.id)
                            ? "Waiting to sync"
                            : [tx.category, time].filter(Boolean).join(" · ")}
                        </span>
                      </p>
                    </div>

                    {/* The amount is the point of the row — it outweighs the title. */}
                    <div className="flex shrink-0 items-center gap-1.5">
                      <span className="text-base font-semibold tabular-nums text-foreground sm:text-lg">
                        {formatCurrency(tx.amount)}
                      </span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground/60" />
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        ))
      )}

      {remaining > 0 && (
        <button
          type="button"
          onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
          className="w-full border-t border-border/50 px-4 py-3 text-sm font-medium text-primary transition-colors hover:bg-muted/40"
        >
          Show {Math.min(remaining, PAGE_SIZE)} more
          <span className="ml-1 text-muted-foreground">({remaining} left)</span>
        </button>
      )}
    </div>
  );
}
