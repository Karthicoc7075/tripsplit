import type { Outing } from "@/types";
import { getOutingMemberIds, getOutingMembers } from "@/lib/members";

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

  if (startDate) {
    const start = startOfDay(new Date(startDate));
    if (!Number.isNaN(start.getTime())) {
      if (today < start) {
        return "planned";
      }
      if (endDate) {
        const end = startOfDay(new Date(endDate));
        if (!Number.isNaN(end.getTime()) && today >= start && today <= end) {
          return "ongoing";
        }
      }
      return "ongoing";
    }
  }
  return "ongoing";
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

export function getMemberPaidAndShare(
  memberId: string,
  transactions: import("@/types").Transaction[]
): { paid: number; share: number } {
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

  return {
    paid: Math.round(paid * 100) / 100,
    share: Math.round(share * 100) / 100,
  };
}