import type { Friend, Outing, SettlementRecord, Transaction } from "@/types";
import {
  computeMemberBalances,
  getOutingTotalSpent,
  simplifyDebts,
} from "@/lib/balances";
import { roundMoney } from "@/lib/format";

export interface DiscoverableUser {
  id: string;
  email: string;
  name: string;
  phone?: string;
}

export type FriendSort = "balance" | "recent" | "name";

export interface FriendOutingSummary {
  outing: Outing;
  yourBalance: number;
  totalSpent: number;
}

export interface FriendsOverallSummary {
  youAreOwed: number;
  youOwe: number;
  netBalance: number;
  pendingCount: number;
}

export { searchUserByEmail as searchDiscoverableUsers, getDiscoverableUsers } from "@/lib/firestore";

export function getFriendsOverallSummary(
  friends: Friend[],
  balances: Map<string, number>
): FriendsOverallSummary {
  let youAreOwed = 0;
  let youOwe = 0;
  let pendingCount = 0;

  for (const friend of friends) {
    const bal = balances.get(friend.id) ?? 0;
    if (Math.abs(bal) < 0.01) continue;
    pendingCount++;
    if (bal > 0) youAreOwed += bal;
    else youOwe += Math.abs(bal);
  }

  return {
    youAreOwed: roundMoney(youAreOwed),
    youOwe: roundMoney(youOwe),
    netBalance: roundMoney(youAreOwed - youOwe),
    pendingCount,
  };
}

export function getCommonOutings(
  friend: Friend,
  outings: Outing[],
  currentUserId: string
): Outing[] {
  return outings.filter(
    (o) =>
      o.members.some((m) => m.id === currentUserId) &&
      o.members.some(
        (m) => m.id === friend.id || m.name.toLowerCase() === friend.name.toLowerCase()
      )
  );
}

export function getFriendOutingSummaries(
  friend: Friend,
  outings: Outing[],
  transactions: Transaction[],
  currentUserId: string,
  settlementRecords: SettlementRecord[] = []
): FriendOutingSummary[] {
  const common = getCommonOutings(friend, outings, currentUserId);

  return common
    .map((outing) => {
      const txs = transactions.filter((t) => t.outingId === outing.id);
      const records = settlementRecords.filter((r) => r.outingId === outing.id);
      const memberId =
        outing.members.find((m) => m.id === friend.id)?.id ??
        outing.members.find((m) => m.name.toLowerCase() === friend.name.toLowerCase())?.id;

      let yourBalance = 0;
      if (memberId) {
        const balances = computeMemberBalances(outing.members, txs, records);
        const edges = simplifyDebts(
          balances.filter((b) => b.memberId === currentUserId || b.memberId === memberId)
        );
        for (const edge of edges) {
          if (edge.fromId === memberId && edge.toId === currentUserId) {
            yourBalance += edge.amount;
          } else if (edge.fromId === currentUserId && edge.toId === memberId) {
            yourBalance -= edge.amount;
          }
        }
      }

      return {
        outing,
        yourBalance: roundMoney(yourBalance),
        totalSpent: getOutingTotalSpent(txs),
      };
    })
    .sort((a, b) => Math.abs(b.yourBalance) - Math.abs(a.yourBalance));
}

export function getLastOutingWithFriend(
  friend: Friend,
  outings: Outing[],
  currentUserId: string
): Outing | null {
  const common = getCommonOutings(friend, outings, currentUserId);
  if (common.length === 0) return null;

  return [...common].sort((a, b) => {
    const aDate = a.startDate ?? a.createdAt;
    const bDate = b.startDate ?? b.createdAt;
    return new Date(bDate).getTime() - new Date(aDate).getTime();
  })[0];
}

export function getActiveOutingCountWithFriend(
  friend: Friend,
  outings: Outing[],
  currentUserId: string
): number {
  return getCommonOutings(friend, outings, currentUserId).filter(
    (o) => o.status === "ongoing"
  ).length;
}

export function getRecentTransactionsWithFriend(
  friend: Friend,
  outings: Outing[],
  transactions: Transaction[],
  currentUserId: string,
  limit = 3
): Transaction[] {
  const commonIds = new Set(getCommonOutings(friend, outings, currentUserId).map((o) => o.id));

  return transactions
    .filter((t) => commonIds.has(t.outingId))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);
}

export function sortFriends(
  friends: Friend[],
  balances: Map<string, number>,
  sort: FriendSort
): Friend[] {
  const sorted = [...friends];
  switch (sort) {
    case "balance":
      return sorted.sort(
        (a, b) =>
          Math.abs(balances.get(b.id) ?? 0) - Math.abs(balances.get(a.id) ?? 0)
      );
    case "name":
      return sorted.sort((a, b) => a.name.localeCompare(b.name));
    case "recent":
    default:
      return sorted.sort((a, b) => {
        const aTime = a.addedAt ? new Date(a.addedAt).getTime() : 0;
        const bTime = b.addedAt ? new Date(b.addedAt).getTime() : 0;
        return bTime - aTime;
      });
  }
}

export function getBalanceLabel(balance: number, friendName: string): string {
  if (Math.abs(balance) < 0.01) return "All settled";
  if (balance > 0) return `${friendName} owes you`;
  return `You owe ${friendName}`;
}