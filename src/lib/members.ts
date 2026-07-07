import type { Outing, OutingMember, Transaction } from "@/types";

/** Safe members list — falls back to creator when members is missing. */
export function getOutingMembers(outing: Outing): OutingMember[] {
  if (outing.members?.length) return outing.members;
  if (outing.createdById) {
    return [{ id: outing.createdById, name: outing.createdByName ?? "Unknown" }];
  }
  return [];
}

export function getOutingMemberIds(outing: Outing): string[] {
  return getOutingMembers(outing).map((member) => member.id);
}

export function membersChanged(
  current: OutingMember[],
  nextIds: string[]
): boolean {
  const currentIds = current.map((m) => m.id).sort().join(",");
  const next = [...nextIds].sort().join(",");
  return currentIds !== next;
}

export function getRemovedMemberIds(
  current: OutingMember[],
  nextIds: string[]
): string[] {
  const nextSet = new Set(nextIds);
  return current.filter((m) => !nextSet.has(m.id)).map((m) => m.id);
}

export function getAddedMemberIds(
  current: OutingMember[],
  nextIds: string[]
): string[] {
  const currentSet = new Set(current.map((m) => m.id));
  return nextIds.filter((id) => !currentSet.has(id));
}

/** Transactions where a removed member paid or has a payment entry */
export function getTransactionsNeedingReview(
  transactions: Transaction[],
  removedMemberIds: string[]
): Transaction[] {
  if (removedMemberIds.length === 0) return [];
  const removed = new Set(removedMemberIds);
  return transactions.filter((tx) => {
    if (removed.has(tx.paidById)) return true;
    return tx.payments?.some((p) => removed.has(p.memberId)) ?? false;
  });
}

export function buildMembersList(
  memberIds: string[],
  currentMembers: OutingMember[],
  friends: { id: string; name: string }[],
  currentUserId: string,
  currentUserName: string
): OutingMember[] {
  return memberIds.map((id) => {
    const existing = currentMembers.find((m) => m.id === id);
    if (existing) return existing;
    if (id === currentUserId) return { id, name: currentUserName };
    const friend = friends.find((f) => f.id === id);
    return { id, name: friend?.name ?? "Unknown" };
  });
}