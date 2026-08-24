import type { Outing, SettlementRecord, Transaction } from "@/types";
import { getOutingMemberIds, getOutingMembers } from "@/lib/members";
import { parseLocalDate } from "@/lib/format";

export type OutingFilter = "all" | "ongoing" | "settled" | "planned";
export type OutingSort = "newest" | "spent" | "name";

export { getOutingMembers, getOutingMemberIds };

export function getOutingCreatorId(outing: Outing): string | undefined {
  return outing.createdById ?? getOutingMembers(outing)[0]?.id;
}

export function isOutingCreator(outing: Outing, userId: string): boolean {
  const creatorId = getOutingCreatorId(outing);
  return creatorId != null && creatorId === userId;
}

/** User sees outings they created or are a member of (Bug #1 fix). */
export function getMyOutings(outings: Outing[], userId: string): Outing[] {
  return outings.filter((outing) => {
    const memberIds = getOutingMemberIds(outing);
    const isCreator = outing.createdById === userId;
    const isMember = memberIds.includes(userId);
    return isCreator || isMember;
  });
}

export function formatOutingDates(outing: Outing): string {
  if (outing.startDate && outing.endDate) {
    const start = formatShortDate(outing.startDate);
    const end = formatShortDate(outing.endDate);
    return start === end ? start : `${start} – ${end}`;
  }
  if (outing.startDate) return formatShortDate(outing.startDate);
  if (outing.date && outing.date !== "Just now") return outing.date;
  return "";
}

function formatShortDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function deriveOutingStatus(
  startDate?: string,
  endDate?: string,
  explicit?: "ongoing" | "settled" | "planned"
): "ongoing" | "settled" | "planned" {
  if (explicit === "settled") return "settled";
  if (explicit === "planned") return "planned";
  if (explicit === "ongoing") return "ongoing";

  const today = startOfDay(new Date());

  const parsedStart = parseLocalDate(startDate);
  if (parsedStart) {
    const start = startOfDay(parsedStart);
    if (today < start) {
      return "planned";
    }
    const parsedEnd = parseLocalDate(endDate);
    if (parsedEnd) {
      const end = startOfDay(parsedEnd);
      if (today >= start && today <= end) {
        return "ongoing";
      }
    }
    return "ongoing";
  }
  return "ongoing";
}

/** Last calendar day the outing covers. Null when it carries no dates at all. */
export function getOutingEndDay(outing: Outing): Date | null {
  const parsed = parseLocalDate(outing.endDate) ?? parseLocalDate(outing.startDate);
  return parsed ? startOfDay(parsed) : null;
}

/**
 * Whether the outing's last day is already behind us.
 *
 * An outing with no dates never ends on its own — there is nothing to compare
 * against, so it stays active until someone closes it by hand.
 */
export function hasOutingEnded(outing: Outing, today: Date = new Date()): boolean {
  const end = getOutingEndDay(outing);
  return end != null && end.getTime() < startOfDay(today).getTime();
}

/** Whole days since the outing finished; 0 on the day after it ended. */
export function daysSinceOutingEnded(outing: Outing, today: Date = new Date()): number | null {
  const end = getOutingEndDay(outing);
  if (end == null) return null;
  return Math.round((startOfDay(today).getTime() - end.getTime()) / 86_400_000);
}

/**
 * How a finished outing landed against the budget it was given.
 *
 * `savedPct` and `overPct` are both shares of the *budget*, not of the spend,
 * so "20% under" and "20% over" mean the same size of miss in either direction.
 */
export interface BudgetOutcome {
  budget: number;
  spent: number;
  /** Money left unspent. 0 once the budget is blown. */
  saved: number;
  /** `saved` as a percentage of the budget (0–100). */
  savedPct: number;
  /** Money spent past the budget. 0 while still inside it. */
  overBy: number;
  /** `overBy` as a percentage of the budget. */
  overPct: number;
  isOver: boolean;
  /** Share of the budget actually spent, capped at 100 for the meter. */
  usedPct: number;
}

export function getBudgetOutcome(budget?: number, spent = 0): BudgetOutcome | null {
  if (!budget || budget <= 0) return null;

  const diff = roundMoney(budget - spent);
  const isOver = diff < 0;
  const saved = isOver ? 0 : diff;
  const overBy = isOver ? Math.abs(diff) : 0;
  const pct = (value: number) => Math.round((value / budget) * 1000) / 10;

  return {
    budget: roundMoney(budget),
    spent: roundMoney(spent),
    saved,
    savedPct: pct(saved),
    overBy,
    overPct: pct(overBy),
    isOver,
    usedPct: Math.min(pct(spent), 100),
  };
}

export function getOutingStatusLabel(status: Outing["status"]): string {
  switch (status) {
    case "planned":
      return "Planning trip";
    case "ongoing":
      return "Active outing";
    case "settled":
      return "Completed outing";
  }
}

export function sortOutings(
  outings: Outing[],
  sort: OutingSort,
  getTotalSpent: (id: string) => number
): Outing[] {
  const sorted = [...outings];
  switch (sort) {
    case "spent":
      return sorted.sort((a, b) => getTotalSpent(b.id) - getTotalSpent(a.id));
    case "name":
      return sorted.sort((a, b) => a.name.localeCompare(b.name));
    case "newest":
    default:
      return sorted.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
  }
}

export function filterOutings(
  outings: Outing[],
  filter: OutingFilter,
  search: string
): Outing[] {
  const q = search.toLowerCase().trim();
  return outings.filter((o) => {
    const matchesFilter = filter === "all" || o.status === filter;
    const matchesSearch =
      !q ||
      o.name.toLowerCase().includes(q) ||
      o.category.toLowerCase().includes(q) ||
      (o.location?.toLowerCase().includes(q) ?? false);
    return matchesFilter && matchesSearch;
  });
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Every money figure for one member, from one place, so each card can pick the
 * one it means instead of re-deriving it:
 *
 *   paid      — money fronted as the payer of a transaction
 *   share     — what the outing actually cost this member
 *   settledIn — settlement money received from others
 *   settledOut— settlement money sent to others
 *   cashOut   — real money out of pocket (paid + settledOut − settledIn);
 *               converges to `share` once everyone has settled
 *   net       — paid − share + settledOut − settledIn.
 *               Positive = others owe them; negative = they owe others.
 *               Matches computeMemberBalances() in lib/balances.ts.
 */
export interface MemberCashFlow {
  paid: number;
  share: number;
  settledIn: number;
  settledOut: number;
  cashOut: number;
  net: number;
}

export function getMemberCashFlow(
  memberId: string,
  transactions: Transaction[],
  settlementRecords: SettlementRecord[] = []
): MemberCashFlow {
  let paid = 0;
  let share = 0;

  for (const tx of transactions) {
    const payments = tx.payments?.length
      ? tx.payments
      : [{ memberId: tx.paidById, paidByName: tx.paidByName, amount: tx.amount }];

    for (const p of payments) {
      if (p.memberId === memberId) paid += p.amount;
    }

    const split = tx.splits.find((s) => s.memberId === memberId);
    if (split) share += split.amount;
  }

  let settledIn = 0;
  let settledOut = 0;

  for (const record of settlementRecords) {
    if (record.fromId === memberId) settledOut += record.amount;
    if (record.toId === memberId) settledIn += record.amount;
  }

  return {
    paid: roundMoney(paid),
    share: roundMoney(share),
    settledIn: roundMoney(settledIn),
    settledOut: roundMoney(settledOut),
    cashOut: roundMoney(paid + settledOut - settledIn),
    net: roundMoney(paid - share + settledOut - settledIn),
  };
}

export function getMemberPaidAndShare(
  memberId: string,
  transactions: Transaction[]
): { paid: number; share: number } {
  const { paid, share } = getMemberCashFlow(memberId, transactions);
  return { paid, share };
}