import { useMemo } from "react";
import { useData } from "@/context/DataContext";
import { computeFriendBalances } from "@/lib/balances";
import { getCategoryBreakdown } from "@/lib/dashboard";
import {
  applyOutingFilters,
  buildOutingMemory,
  getAvailableYears,
  getOutingDate,
  groupOutingsByMonth,
  isRealOuting,
  type MemorySection,
  type OutingMemory,
  type ReportFilters,
} from "@/lib/reportFilters";
import {
  filterTransactionsByPeriod,
  getReportSummary,
  getSpendingTrendForPeriod,
} from "@/lib/reports";
import { getOutingMembers } from "@/lib/members";

export interface YearReview {
  label: string;
  outingCount: number;
  totalSpent: number;
  yourSpent: number;
  biggest: { name: string; amount: number } | null;
  topCategory: { name: string; count: number } | null;
  busiestMonth: string | null;
  /** Same figures for the previous year, when there are any. */
  previous: { label: string; totalSpent: number } | null;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/**
 * Single source of truth for the Reports page. Every tab reads from here, so a
 * new chart or export consumes this hook instead of re-deriving the same maths
 * in the component — which is how the page stops rotting as features land.
 */
export function useReportData(filters: ReportFilters) {
  const {
    outings,
    transactions,
    friends,
    settlementRecords,
    currentUserId,
    currentUserName,
    loading,
  } = useData();

  const realOutings = useMemo(() => outings.filter(isRealOuting), [outings]);

  const realOutingIds = useMemo(
    () => new Set(realOutings.map((o) => o.id)),
    [realOutings]
  );

  const realTransactions = useMemo(
    () => transactions.filter((t) => realOutingIds.has(t.outingId)),
    [transactions, realOutingIds]
  );

  const realSettlements = useMemo(
    () => settlementRecords.filter((r) => realOutingIds.has(r.outingId)),
    [settlementRecords, realOutingIds]
  );

  // ── Filter choices, derived from the data so new years/categories appear on
  //    their own rather than being hardcoded.
  const availableYears = useMemo(() => getAvailableYears(realOutings), [realOutings]);

  const availableCategories = useMemo(() => {
    const set = new Set(realOutings.map((o) => o.category));
    return Array.from(set).sort();
  }, [realOutings]);

  const availableMembers = useMemo(() => {
    const map = new Map<string, string>();
    for (const o of realOutings) {
      for (const m of getOutingMembers(o)) {
        if (m.id !== currentUserId && !map.has(m.id)) map.set(m.id, m.name);
      }
    }
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [realOutings, currentUserId]);

  // ── Memories tab
  const filteredOutings = useMemo(
    () => applyOutingFilters(realOutings, realTransactions, filters),
    [realOutings, realTransactions, filters]
  );

  const filteredOutingIds = useMemo(
    () => new Set(filteredOutings.map((o) => o.id)),
    [filteredOutings]
  );

  const filteredTransactions = useMemo(
    () => realTransactions.filter((t) => filteredOutingIds.has(t.outingId)),
    [realTransactions, filteredOutingIds]
  );

  const filteredSettlements = useMemo(
    () => realSettlements.filter((r) => filteredOutingIds.has(r.outingId)),
    [realSettlements, filteredOutingIds]
  );

  const sections: MemorySection[] = useMemo(
    () => groupOutingsByMonth(filteredOutings),
    [filteredOutings]
  );

  const memories = useMemo(() => {
    const map = new Map<string, OutingMemory>();
    for (const o of filteredOutings) {
      map.set(
        o.id,
        buildOutingMemory(o, realTransactions, realSettlements, currentUserId)
      );
    }
    return map;
  }, [filteredOutings, realTransactions, realSettlements, currentUserId]);

  // ── Year in review
  const yearReview: YearReview | null = useMemo(() => {
    const scoped =
      filters.year === "all"
        ? filteredOutings
        : filteredOutings.filter(
            (o) => String(getOutingDate(o).getFullYear()) === filters.year
          );
    if (scoped.length === 0) return null;

    let totalSpent = 0;
    let yourSpent = 0;
    let biggest: { name: string; amount: number } | null = null;
    const categoryCounts = new Map<string, number>();
    const monthTotals = new Map<number, number>();

    for (const o of scoped) {
      const m = memories.get(o.id);
      if (!m) continue;
      totalSpent += m.totalSpent;
      yourSpent += m.yourSpent;
      if (!biggest || m.totalSpent > biggest.amount) {
        biggest = { name: o.name, amount: m.totalSpent };
      }
      categoryCounts.set(o.category, (categoryCounts.get(o.category) ?? 0) + 1);
      const month = getOutingDate(o).getMonth();
      monthTotals.set(month, (monthTotals.get(month) ?? 0) + m.totalSpent);
    }

    const topCategory = Array.from(categoryCounts.entries()).sort(
      (a, b) => b[1] - a[1]
    )[0];
    const busiest = Array.from(monthTotals.entries()).sort((a, b) => b[1] - a[1])[0];

    // Year-over-year comparison, only meaningful on a specific year.
    let previous: YearReview["previous"] = null;
    if (filters.year !== "all") {
      const prevLabel = String(Number(filters.year) - 1);
      const prevOutings = realOutings.filter(
        (o) => String(getOutingDate(o).getFullYear()) === prevLabel
      );
      if (prevOutings.length > 0) {
        const prevTotal = prevOutings.reduce((sum, o) => {
          const txs = realTransactions.filter((t) => t.outingId === o.id);
          return sum + txs.reduce((s, t) => s + t.amount, 0);
        }, 0);
        previous = { label: prevLabel, totalSpent: Math.round(prevTotal * 100) / 100 };
      }
    }

    return {
      label: filters.year === "all" ? "All time" : filters.year,
      outingCount: scoped.length,
      totalSpent: Math.round(totalSpent * 100) / 100,
      yourSpent: Math.round(yourSpent * 100) / 100,
      biggest,
      topCategory: topCategory ? { name: topCategory[0], count: topCategory[1] } : null,
      busiestMonth: busiest != null ? MONTHS[busiest[0]] : null,
      previous,
    };
  }, [filteredOutings, memories, filters.year, realOutings, realTransactions]);

  // ── Insights tab (period-scoped rather than year-scoped)
  const summary = useMemo(
    () => getReportSummary(filteredTransactions, filteredOutings, currentUserId, filters.period),
    [filteredTransactions, filteredOutings, currentUserId, filters.period]
  );

  const periodTransactions = useMemo(
    () => filterTransactionsByPeriod(filteredTransactions, filters.period),
    [filteredTransactions, filters.period]
  );

  const categoryData = useMemo(
    () => getCategoryBreakdown(periodTransactions),
    [periodTransactions]
  );

  const spendingTrend = useMemo(
    () => getSpendingTrendForPeriod(filteredTransactions, currentUserId, filters.period),
    [filteredTransactions, currentUserId, filters.period]
  );

  const outingRankings = useMemo(
    () =>
      filteredOutings
        .map((o) => {
          const m = memories.get(o.id);
          return {
            id: o.id,
            name: o.name,
            category: o.category,
            spent: m?.totalSpent ?? 0,
            share: m?.yourShare ?? 0,
            transactionCount: m?.transactionCount ?? 0,
            percent: 0,
          };
        })
        .filter((o) => o.spent > 0)
        .sort((a, b) => b.spent - a.spent)
        .map((o, _i, arr) => {
          const total = arr.reduce((s, x) => s + x.spent, 0);
          return { ...o, percent: total > 0 ? Math.round((o.spent / total) * 100) : 0 };
        }),
    [filteredOutings, memories]
  );

  // ── Friends tab
  const friendBalances = useMemo(
    () =>
      computeFriendBalances(
        friends,
        filteredOutings,
        filteredTransactions,
        currentUserId,
        currentUserName,
        filteredSettlements
      ),
    [
      friends,
      filteredOutings,
      filteredTransactions,
      filteredSettlements,
      currentUserId,
      currentUserName,
    ]
  );

  const sortedFriends = useMemo(
    () =>
      [...friends].sort(
        (a, b) =>
          Math.abs(friendBalances.get(b.id) ?? 0) - Math.abs(friendBalances.get(a.id) ?? 0)
      ),
    [friends, friendBalances]
  );

  return {
    loading,
    currentUserId,
    currentUserName,
    friends,
    hasAnyOutings: realOutings.length > 0,
    availableYears,
    availableCategories,
    availableMembers,
    filteredOutings,
    filteredTransactions,
    sections,
    memories,
    yearReview,
    summary,
    categoryData,
    spendingTrend,
    outingRankings,
    friendBalances,
    sortedFriends,
  };
}
