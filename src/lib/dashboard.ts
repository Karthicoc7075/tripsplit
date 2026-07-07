import type { Transaction, Outing } from "@/types";
import type { ActivityItem } from "@/components/dashboard/ActivityFeed";
import { formatRelativeTime } from "@/lib/format";
import { memberLabel } from "@/lib/displayNames";

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function getUserShare(tx: Transaction, userId: string): number {
  const split = tx.splits.find((s) => s.memberId === userId);
  return split?.amount ?? 0;
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
    .filter((tx) => isCurrentMonth(new Date(tx.createdAt)))
    .reduce((sum, tx) => sum + getUserShare(tx, userId), 0);
}

export function getMonthOverMonthTrend(
  transactions: Transaction[],
  userId: string
): { value: string; positive: boolean } | undefined {
  const thisMonth = getThisMonthSpent(transactions, userId);
  const lastMonth = transactions
    .filter((tx) => isPreviousMonth(new Date(tx.createdAt)))
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
    const d = new Date(tx.createdAt);
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

export function getRecentActivity(
  transactions: Transaction[],
  outings: Outing[],
  userId: string,
  userName: string,
  limit = 5
): ActivityItem[] {
  const outingMap = new Map(outings.map((o) => [o.id, o]));

  return getTransactionsForOutings(transactions, outings)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit)
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

      let text = `${payerText} paid ₹${tx.amount.toLocaleString("en-IN")} for '${tx.title}'`;
      if (outing) {
        text += ` in ${outing.name}`;
      }

      return {
        id: tx.id,
        text,
        time: formatRelativeTime(tx.createdAt),
        type,
      };
    });
}