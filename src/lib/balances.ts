import type {
  Transaction,
  OutingMember,
  MemberBalance,
  DebtEdge,
  Settlement,
  SettlementRecord,
  DashboardStats,
  Friend,
  Outing,
  SplitMode,
} from "@/types";

/**
 * Balance calculation strategy:
 * - Each transaction: payer gets +amount credit; each split member owes their share (-amount).
 * - Member balance = total paid − total owed. Positive = owed money; negative = owes money.
 * - Balances are computed on read from transactions (not stored separately) for consistency.
 * - Debt simplification uses a greedy min-cash-flow algorithm on net balances.
 */

export function computeSplits(
  amount: number,
  members: OutingMember[],
  splitMode: SplitMode,
  customSplits?: { memberId: string; amount: number }[]
): { memberId: string; amount: number }[] {
  if (splitMode === "equally") {
    const share = amount / members.length;
    return members.map((m) => ({ memberId: m.id, amount: share }));
  }
  if (customSplits?.length) {
    return customSplits;
  }
  return members.map((m) => ({ memberId: m.id, amount: 0 }));
}

function applySettlementRecords(
  balances: Map<string, number>,
  records: SettlementRecord[]
): void {
  for (const record of records) {
    const fromBal = balances.get(record.fromId) ?? 0;
    const toBal = balances.get(record.toId) ?? 0;
    balances.set(record.fromId, fromBal + record.amount);
    balances.set(record.toId, toBal - record.amount);
  }
}

export function computeMemberBalances(
  members: OutingMember[],
  transactions: Transaction[],
  settlementRecords: SettlementRecord[] = []
): MemberBalance[] {
  const balances = new Map<string, number>();
  members.forEach((m) => balances.set(m.id, 0));

  for (const tx of transactions) {
    const payments = tx.payments?.length
      ? tx.payments
      : [{ memberId: tx.paidById, paidByName: tx.paidByName, amount: tx.amount }];

    for (const payment of payments) {
      const current = balances.get(payment.memberId) ?? 0;
      balances.set(payment.memberId, current + payment.amount);
    }

    for (const split of tx.splits) {
      const splitBal = balances.get(split.memberId) ?? 0;
      balances.set(split.memberId, splitBal - split.amount);
    }
  }

  applySettlementRecords(balances, settlementRecords);

  return members.map((m) => ({
    memberId: m.id,
    name: m.name,
    balance: Math.round((balances.get(m.id) ?? 0) * 100) / 100,
  }));
}

export function getOutingTotalSpent(transactions: Transaction[]): number {
  return transactions.reduce((sum, tx) => sum + tx.amount, 0);
}

export function getMemberBalance(
  memberId: string,
  members: OutingMember[],
  transactions: Transaction[],
  settlementRecords: SettlementRecord[] = []
): number {
  return (
    computeMemberBalances(members, transactions, settlementRecords).find(
      (b) => b.memberId === memberId
    )?.balance ?? 0
  );
}

export function simplifyDebts(balances: MemberBalance[]): DebtEdge[] {
  const creditors: { id: string; name: string; amount: number }[] = [];
  const debtors: { id: string; name: string; amount: number }[] = [];

  for (const b of balances) {
    if (b.balance > 0.01) creditors.push({ id: b.memberId, name: b.name, amount: b.balance });
    else if (b.balance < -0.01) debtors.push({ id: b.memberId, name: b.name, amount: -b.balance });
  }

  creditors.sort((a, b) => b.amount - a.amount);
  debtors.sort((a, b) => b.amount - a.amount);

  const edges: DebtEdge[] = [];
  let i = 0;
  let j = 0;

  while (i < creditors.length && j < debtors.length) {
    const settle = Math.min(creditors[i].amount, debtors[j].amount);
    if (settle > 0.01) {
      edges.push({
        fromId: debtors[j].id,
        fromName: debtors[j].name,
        toId: creditors[i].id,
        toName: creditors[i].name,
        amount: Math.round(settle * 100) / 100,
      });
    }
    creditors[i].amount -= settle;
    debtors[j].amount -= settle;
    if (creditors[i].amount < 0.01) i++;
    if (debtors[j].amount < 0.01) j++;
  }

  return edges;
}

export function computeGlobalSettlements(
  outings: Outing[],
  allTransactions: Transaction[],
  currentUserId: string,
  allSettlementRecords: SettlementRecord[] = []
): Settlement[] {
  const settlements: Settlement[] = [];

  for (const outing of outings) {
    const txs = allTransactions.filter((t) => t.outingId === outing.id);
    const records = allSettlementRecords.filter((r) => r.outingId === outing.id);
    const balances = computeMemberBalances(outing.members, txs, records);
    const edges = simplifyDebts(balances);

    for (const edge of edges) {
      if (edge.fromId === currentUserId || edge.toId === currentUserId) {
        settlements.push({
          id: `${outing.id}-${edge.fromId}-${edge.toId}`,
          fromId: edge.fromId,
          fromName: edge.fromName,
          toId: edge.toId,
          toName: edge.toName,
          amount: edge.amount,
          outingId: outing.id,
          outingName: outing.name,
        });
      }
    }
  }

  return settlements;
}

export function computeFriendBalances(
  friends: Friend[],
  outings: Outing[],
  allTransactions: Transaction[],
  currentUserId: string,
  _currentUserName: string,
  allSettlementRecords: SettlementRecord[] = []
): Map<string, number> {
  const friendBalances = new Map<string, number>();
  friends.forEach((f) => friendBalances.set(f.id, 0));

  for (const outing of outings) {
    const txs = allTransactions.filter((t) => t.outingId === outing.id);
    const records = allSettlementRecords.filter((r) => r.outingId === outing.id);
    const balances = computeMemberBalances(outing.members, txs, records);

    for (const member of outing.members) {
      if (member.id === currentUserId) continue;
      const friend = friends.find(
        (f) => f.id === member.id || f.name.toLowerCase() === member.name.toLowerCase()
      );
      if (!friend) continue;

      const memberBal = balances.find((b) => b.memberId === member.id)?.balance ?? 0;
      const userBal = balances.find((b) => b.memberId === currentUserId)?.balance ?? 0;

      // Net between user and friend within this outing
      const edges = simplifyDebts(balances.filter(
        (b) => b.memberId === currentUserId || b.memberId === member.id
      ));
      for (const edge of edges) {
        if (
          (edge.fromId === currentUserId && edge.toId === member.id) ||
          (edge.fromId === member.id && edge.toId === currentUserId)
        ) {
          const current = friendBalances.get(friend.id) ?? 0;
          if (edge.fromId === currentUserId) {
            friendBalances.set(friend.id, current - edge.amount);
          } else {
            friendBalances.set(friend.id, current + edge.amount);
          }
        }
      }
    }
  }

  return friendBalances;
}

export function computeDashboardStats(
  outings: Outing[],
  allTransactions: Transaction[],
  currentUserId: string,
  allSettlementRecords: SettlementRecord[] = []
): DashboardStats {
  let youOwe = 0;
  let youAreOwed = 0;
  const oweSet = new Set<string>();
  const owedSet = new Set<string>();

  for (const outing of outings.filter((o) => o.status === "ongoing")) {
    const txs = allTransactions.filter((t) => t.outingId === outing.id);
    const records = allSettlementRecords.filter((r) => r.outingId === outing.id);
    const balances = computeMemberBalances(outing.members, txs, records);
    const userBal = balances.find((b) => b.memberId === currentUserId)?.balance ?? 0;

    if (userBal < 0) {
      youOwe += Math.abs(userBal);
      const edges = simplifyDebts(balances);
      edges.filter((e) => e.fromId === currentUserId).forEach((e) => oweSet.add(e.toId));
    } else if (userBal > 0) {
      youAreOwed += userBal;
      const edges = simplifyDebts(balances);
      edges.filter((e) => e.toId === currentUserId).forEach((e) => owedSet.add(e.fromId));
    }
  }

  return {
    totalBalance: Math.round((youAreOwed - youOwe) * 100) / 100,
    youOwe: Math.round(youOwe * 100) / 100,
    youAreOwed: Math.round(youAreOwed * 100) / 100,
    activeOutings: outings.filter((o) => o.status === "ongoing").length,
    oweCount: oweSet.size,
    owedCount: owedSet.size,
  };
}