import type { SettlementRecord, Transaction, Outing } from "@/types";
import type { ActivityItem } from "@/components/dashboard/ActivityFeed";
import { formatCurrency, formatRelativeTime } from "@/lib/format";
import { getFirstName, memberLabel } from "@/lib/displayNames";

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function getUserShare(tx: Transaction, userId: string): number {
  const split = tx.splits.find((s) => s.memberId === userId);
  return split?.amount ?? 0;
}

/**
 * The day the money was actually spent.
 *
 * `tx.date` is the expense date the user picked ("5 Aug 2026"); `tx.createdAt`
 * is only when the record was typed into the app. Charting by `createdAt` drops
 * a trip expense on the day it was logged rather than the day it happened —
 * log a week of Goa receipts tonight and the whole trip spikes on today.
 *
 * Falls back to `createdAt` when `date` is missing or unparseable (older records).
 */
export function getTransactionDate(tx: Transaction): Date {
  if (tx.date) {
    const parsed = new Date(tx.date);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return new Date(tx.createdAt);
}

function isCurrentMonth(date: Date): boolean {
  const now = new Date();
  return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
}

function isPreviousMonth(date: Date): boolean {
  const now = new Date();
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return date.getMonth() === prev.getMonth() && date.getFullYear() === prev.getFullYear();
}

export function getThisMonthSpent(transactions: Transaction[], userId: string): number {
  return transactions
    .filter((tx) => isCurrentMonth(getTransactionDate(tx)))
    .reduce((sum, tx) => sum + getUserShare(tx, userId), 0);
}

export function getMonthOverMonthTrend(
  transactions: Transaction[],
  userId: string
): { value: string; positive: boolean } | undefined {
  const thisMonth = getThisMonthSpent(transactions, userId);
  const lastMonth = transactions
    .filter((tx) => isPreviousMonth(getTransactionDate(tx)))
    .reduce((sum, tx) => sum + getUserShare(tx, userId), 0);

  if (lastMonth === 0) return undefined;

  const pct = Math.round(((thisMonth - lastMonth) / lastMonth) * 100);
  return {
    value: `${Math.abs(pct)}% from last month`,
    positive: pct <= 0,
  };
}

export function getCategoryBreakdown(transactions: Transaction[]): { name: string; value: number }[] {
  const map = new Map<string, number>();
  for (const tx of transactions) {
    const cat = tx.category ?? "Other";
    map.set(cat, (map.get(cat) ?? 0) + tx.amount);
  }
  return Array.from(map.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

export function getOutingExpenseBreakdown(
  outingId: string,
  transactions: Transaction[]
): { name: string; value: number }[] {
  return getCategoryBreakdown(transactions.filter((t) => t.outingId === outingId));
}

export function getSpendingTrend(transactions: Transaction[], userId: string, months = 6): { month: string; amount: number }[] {
  const now = new Date();
  const buckets: { month: string; amount: number; year: number; monthIdx: number }[] = [];

  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.push({
      month: MONTH_LABELS[d.getMonth()],
      amount: 0,
      year: d.getFullYear(),
      monthIdx: d.getMonth(),
    });
  }

  for (const tx of transactions) {
    const d = getTransactionDate(tx);
    const bucket = buckets.find(
      (b) => b.year === d.getFullYear() && b.monthIdx === d.getMonth()
    );
    if (bucket) {
      bucket.amount += getUserShare(tx, userId);
    }
  }

  return buckets.map(({ month, amount }) => ({ month, amount }));
}

/** Only transactions tied to outings that still exist for this user. */
export function getTransactionsForOutings(
  transactions: Transaction[],
  outings: Outing[]
): Transaction[] {
  const outingIds = new Set(outings.map((o) => o.id));
  return transactions.filter((tx) => outingIds.has(tx.outingId));
}

/**
 * Money moving back is as much "activity" as money going out — a settlement is
 * often the item people most want to see. Merged into the same feed, newest
 * first, which is also what finally uses the `settled` type the feed declares.
 */
type DatedActivityItem = ActivityItem & { at: number };

function buildSettlementActivity(
  records: SettlementRecord[],
  outings: Outing[],
  userId: string
): DatedActivityItem[] {
  const outingMap = new Map(outings.map((o) => [o.id, o]));

  return records
    .filter((r) => outingMap.has(r.outingId))
    .map((r) => {
      const amount = formatCurrency(r.amount);
      const from = getFirstName(r.fromName);
      const to = getFirstName(r.toName);

      let text: string;
      if (r.fromId === userId) {
        text = `You paid ${to} ${amount}`;
      } else if (r.toId === userId) {
        text = `${from} paid you ${amount}`;
      } else {
        text = `${from} paid ${to} ${amount}`;
      }

      const outing = outingMap.get(r.outingId);
      if (outing) text += ` in ${outing.name}`;

      return {
        id: r.id,
        text,
        time: formatRelativeTime(r.createdAt),
        type: "settled" as const,
        at: new Date(r.createdAt).getTime(),
      };
    });
}

export function getRecentActivity(
  transactions: Transaction[],
  outings: Outing[],
  userId: string,
  userName: string,
  limit = 5,
  settlementRecords: SettlementRecord[] = []
): ActivityItem[] {
  const outingMap = new Map(outings.map((o) => [o.id, o]));

  const expenseItems: DatedActivityItem[] = getTransactionsForOutings(transactions, outings)
    .map((tx) => {
      const outing = outingMap.get(tx.outingId);
      
      let payerText = "";
      if (tx.payments && tx.payments.length > 1) {
        const names = tx.payments.map((p) => {
          let mName = p.paidByName;
          for (const o of outings) {
            const m = o.members?.find((m) => m.id === p.memberId);
            if (m) {
              mName = m.name;
              break;
            }
          }
          return memberLabel(
            p.memberId === userId ? userName : mName,
            p.memberId === userId
          );
        });

        if (names.length === 2) {
          payerText = `${names[0]} and ${names[1]}`;
        } else {
          payerText = `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
        }
      } else {
        payerText = memberLabel(
          tx.paidById === userId ? userName : tx.paidByName,
          tx.paidById === userId
        );
      }

      const type: ActivityItem["type"] = "paid";

      let text = `${payerText} paid ${formatCurrency(tx.amount)} for '${tx.title}'`;
      if (outing) {
        text += ` in ${outing.name}`;
      }

      return {
        id: tx.id,
        text,
        time: formatRelativeTime(tx.createdAt),
        type,
        at: new Date(tx.createdAt).getTime(),
      };
    });

  return [...expenseItems, ...buildSettlementActivity(settlementRecords, outings, userId)]
    .sort((a, b) => b.at - a.at)
    .slice(0, limit)
    .map(({ at: _at, ...item }) => item);
}