import type { Transaction, Outing } from "@/types";
import { getMemberPaidAndShare } from "@/lib/outing";
import { getCategoryBreakdown, getSpendingTrend, getTransactionDate } from "@/lib/dashboard";
import { roundMoney } from "@/lib/format";

export type ReportPeriod = "3m" | "6m" | "12m" | "all";

const PERIOD_MONTHS: Record<Exclude<ReportPeriod, "all">, number> = {
  "3m": 3,
  "6m": 6,
  "12m": 12,
};

/** First day of the window, or null for "all time". */
export function getPeriodStart(period: ReportPeriod): Date | null {
  if (period === "all") return null;
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() - (PERIOD_MONTHS[period] - 1), 1);
}

export function filterTransactionsByPeriod(
  transactions: Transaction[],
  period: ReportPeriod
): Transaction[] {
  const start = getPeriodStart(period);
  if (!start) return transactions;
  // By expense date, not createdAt: a four-month-old receipt logged today
  // belongs to the month it happened in.
  return transactions.filter((t) => getTransactionDate(t) >= start);
}

function getUserShare(tx: Transaction, userId: string): number {
  return tx.splits.find((s) => s.memberId === userId)?.amount ?? 0;
}

export interface ReportSummary {
  totalExpenses: number;
  youPaid: number;
  yourShare: number;
  transactionCount: number;
  activeOutings: number;
}

export function getReportSummary(
  transactions: Transaction[],
  outings: Outing[],
  userId: string,
  period: ReportPeriod
): ReportSummary {
  const filtered = filterTransactionsByPeriod(transactions, period);
  const outingIds = new Set(filtered.map((t) => t.outingId));

  let yourShare = 0;
  for (const tx of filtered) {
    yourShare += getUserShare(tx, userId);
  }

  const { paid } = getMemberPaidAndShare(userId, filtered);

  return {
    totalExpenses: roundMoney(filtered.reduce((s, t) => s + t.amount, 0)),
    youPaid: paid,
    yourShare: roundMoney(yourShare),
    transactionCount: filtered.length,
    activeOutings: outings.filter((o) => outingIds.has(o.id)).length,
  };
}

export interface OutingRanking {
  id: string;
  name: string;
  category: string;
  spent: number;
  share: number;
  transactionCount: number;
  percent: number;
}

export function getOutingRankings(
  outings: Outing[],
  transactions: Transaction[],
  userId: string,
  period: ReportPeriod
): OutingRanking[] {
  const filtered = filterTransactionsByPeriod(transactions, period);
  const total = filtered.reduce((s, t) => s + t.amount, 0);

  return outings
    .map((outing) => {
      const txs = filtered.filter((t) => t.outingId === outing.id);
      const spent = txs.reduce((s, t) => s + t.amount, 0);
      const share = txs.reduce((s, t) => s + getUserShare(t, userId), 0);
      return {
        id: outing.id,
        name: outing.name,
        category: outing.category,
        spent: roundMoney(spent),
        share: roundMoney(share),
        transactionCount: txs.length,
        percent: total > 0 ? Math.round((spent / total) * 100) : 0,
      };
    })
    .filter((o) => o.spent > 0)
    .sort((a, b) => b.spent - a.spent);
}

export function getCategoryBreakdownForPeriod(
  transactions: Transaction[],
  period: ReportPeriod
) {
  return getCategoryBreakdown(filterTransactionsByPeriod(transactions, period));
}

export function getSpendingTrendForPeriod(
  transactions: Transaction[],
  userId: string,
  period: ReportPeriod
) {
  const months = period === "all" ? 12 : PERIOD_MONTHS[period];
  return getSpendingTrend(transactions, userId, months);
}

export function downloadFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: `${mime};charset=utf-8;` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function downloadCsv(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}