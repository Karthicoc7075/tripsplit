import { useEffect, useMemo, useState } from "react";
import { ChevronRight, Search, X, CloudOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { formatCurrency, formatClockTime } from "@/lib/format";
import { compareTransactionsByDateDesc, getTransactionDate } from "@/lib/dashboard";
import { getCategoryIcon } from "@/lib/identity";
import { getFirstName } from "@/lib/displayNames";
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

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/**
 * Clock time for the row: the time the user set, else when it was logged.
 *
 * `createdAt` only stands in while the entry day matches the spend day. A
 * back-dated expense with no time sits under an older header, so printing
 * tonight's entry time there would read as if the money went out then.
 */
function formatTime(tx: Transaction): string | null {
  if (tx.time) return formatClockTime(tx.time) || null;
  const created = new Date(tx.createdAt);
  if (Number.isNaN(created.getTime())) return null;
  if (startOfDay(created).getTime() !== startOfDay(getTransactionDate(tx)).getTime()) return null;
  return created.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
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

/** Below this a trip fits on one screen and the search field is just clutter. */
const SEARCH_THRESHOLD = 8;

export function TransactionList({
  transactions,
  currentUserId,
  onSelect,
}: TransactionListProps) {
  const { pendingIds } = useData();
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [query, setQuery] = useState("");

  // Sorted here as well as by the caller: the day headers below assume the
  // rows already arrive newest spend-day first, and a mis-ordered list would
  // repeat a header ("Today … Yesterday … Today") instead of failing loudly.
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matched = q
      ? transactions.filter(
          (t) =>
            t.title.toLowerCase().includes(q) ||
            (t.category ?? "").toLowerCase().includes(q) ||
            (t.description ?? "").toLowerCase().includes(q) ||
            t.paidByName.toLowerCase().includes(q) ||
            String(t.amount).includes(q)
        )
      : transactions.slice();
    return matched.sort(compareTransactionsByDateDesc);
  }, [transactions, query]);

  /**
   * What the matches add up to — the reason people search a trip in the first
   * place ("how much did we spend on metro?"). Counts every match, not just
   * the rows currently paged in, so the figure does not grow as you scroll.
   */
  const matchSummary = useMemo(() => {
    if (!query.trim() || filtered.length === 0) return null;

    let total = 0;
    let yourShare = 0;
    // Who actually put the money down, so the total is not just a lump sum:
    // ₹220 on the metro reads differently when ₹120 of it came out of one
    // person's pocket. Keyed by member so a payer split across several
    // expenses lands on one line.
    const byPayer = new Map<string, { name: string; amount: number }>();
    const addPaid = (memberId: string, name: string, amount: number) => {
      const entry = byPayer.get(memberId);
      if (entry) entry.amount += amount;
      else byPayer.set(memberId, { name, amount });
    };

    for (const tx of filtered) {
      total += tx.amount;
      yourShare += tx.splits.find((s) => s.memberId === currentUserId)?.amount ?? 0;
      // `paidByName` is a joined string once several people chipped in, so the
      // per-payer amounts have to come off `payments` when it is there.
      if (tx.payments?.length) {
        tx.payments.forEach((p) => addPaid(p.memberId, p.paidByName, p.amount));
      } else {
        addPaid(tx.paidById, tx.paidByName, tx.amount);
      }
    }

    const paidBy = [...byPayer.entries()]
      .map(([memberId, entry]) => ({
        memberId,
        label: memberId === currentUserId ? "You" : getFirstName(entry.name),
        amount: entry.amount,
      }))
      .sort((a, b) => b.amount - a.amount);

    return { count: filtered.length, total, yourShare, paidBy };
  }, [filtered, query, currentUserId]);

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
      {transactions.length > SEARCH_THRESHOLD && (
        <div className="border-b border-border/50">
          <div className="relative p-3">
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

          {/* Searching a trip is usually a question about a total — "how much
              did the metro cost us?" — so answer it above the rows. */}
          {matchSummary && (
            <div className="px-3 pb-3">
              <div className="rounded-xl border border-primary/20 bg-primary/[0.05] px-3.5 py-2.5">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {matchSummary.count} {matchSummary.count === 1 ? "expense" : "expenses"}{" "}
                      matching “{query.trim()}”
                    </p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      Your share {formatCurrency(matchSummary.yourShare)}
                    </p>
                  </div>
                  <span className="shrink-0 text-lg font-bold tabular-nums text-primary">
                    {formatCurrency(matchSummary.total)}
                  </span>
                </div>

                <div className="mt-2 flex flex-wrap gap-1.5">
                  {matchSummary.paidBy.map((payer) => (
                    <span
                      key={payer.memberId}
                      className="inline-flex items-baseline gap-1 rounded-full border border-border/60 bg-background/70 px-2 py-0.5 text-[11px] text-muted-foreground"
                    >
                      <span className="font-medium text-foreground">{payer.label}</span>
                      paid
                      <span className="font-medium tabular-nums text-foreground">
                        {formatCurrency(payer.amount)}
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
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
