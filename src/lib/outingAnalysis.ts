import type { Transaction, Outing } from "@/types";
import { getMemberPaidAndShare } from "@/lib/outing";
import { roundMoney } from "@/lib/format";
import { memberLabel } from "@/lib/displayNames";

export interface OutingPersonalStats {
  totalSpent: number;
  yourPaid: number;
  yourShare: number;
  yourBalance: number;
  transactionCount: number;
}

/** Per-user spending for one outing (logged-in user's paid amount, share, and balance). */
export function getOutingPersonalStats(
  outingId: string,
  currentUserId: string,
  transactions: Transaction[]
): OutingPersonalStats {
  const outingTransactions = transactions.filter((tx) => tx.outingId === outingId);

  const totalSpent = roundMoney(
    outingTransactions.reduce((sum, tx) => sum + tx.amount, 0)
  );

  const { paid: yourPaid, share: yourShare } = getMemberPaidAndShare(
    currentUserId,
    outingTransactions
  );

  return {
    totalSpent,
    yourPaid,
    yourShare,
    yourBalance: roundMoney(yourPaid - yourShare),
    transactionCount: outingTransactions.length,
  };
}

export interface PersonalSpendingAnalysis {
  paid: number;
  share: number;
  netBalance: number;
  overspendAmount: number;
  isOverspending: boolean;
  isHighUpfrontPayment: boolean;
  fairShare: number;
  budgetShare?: number;
  isOverBudgetShare: boolean;
  isTripBudgetExceeded: boolean;
  tripBudgetUsedPct: number;
}

export function getPersonalSpendingAnalysis(
  userId: string,
  transactions: Transaction[],
  outing?: Outing
): PersonalSpendingAnalysis {
  const { paid, share } = getMemberPaidAndShare(userId, transactions);
  const netBalance = roundMoney(paid - share);
  const overspendAmount = netBalance < 0 ? Math.abs(netBalance) : 0;
  const memberCount = outing?.members.length ?? 1;
  const budgetShare =
    outing?.budget && outing.budget > 0
      ? roundMoney(outing.budget / memberCount)
      : undefined;

  const totalSpent = roundMoney(
    transactions.reduce((sum, tx) => sum + tx.amount, 0)
  );
  const tripBudget = outing?.budget ?? 0;
  const isTripBudgetExceeded = tripBudget > 0 && totalSpent > tripBudget;
  const tripBudgetUsedPct =
    tripBudget > 0 ? Math.min((totalSpent / tripBudget) * 100, 100) : 0;

  // Paid much more than fair share — high cash outlay (e.g. ₹760 paid vs ₹155 share)
  const isHighUpfrontPayment =
    netBalance > 0.01 && paid > share + 0.01;

  return {
    paid: roundMoney(paid),
    share: roundMoney(share),
    netBalance,
    overspendAmount,
    isOverspending: netBalance < -0.01,
    isHighUpfrontPayment,
    fairShare: roundMoney(share),
    budgetShare,
    isOverBudgetShare: budgetShare != null && share > budgetShare + 0.01,
    isTripBudgetExceeded,
    tripBudgetUsedPct,
  };
}

export function getCategoryBreakdown(transactions: Transaction[]): { name: string; value: number }[] {
  const map = new Map<string, number>();
  for (const tx of transactions) {
    const cat = tx.category ?? "Other";
    map.set(cat, (map.get(cat) ?? 0) + tx.amount);
  }
  return Array.from(map.entries())
    .map(([name, value]) => ({ name, value: roundMoney(value) }))
    .sort((a, b) => b.value - a.value);
}

export function getMemberSpendingData(
  members: Outing["members"],
  transactions: Transaction[],
  currentUserId?: string
): { name: string; paid: number; share: number; return: number; remaining: number }[] {
  return members.map((m) => {
    const { paid, share } = getMemberPaidAndShare(m.id, transactions);
    const balance = roundMoney(paid - share);
    return {
      name: memberLabel(m.name, m.id === currentUserId),
      paid: roundMoney(paid),
      share: roundMoney(share),
      return: balance > 0.01 ? balance : 0,
      remaining: balance < -0.01 ? Math.abs(balance) : 0,
    };
  });
}