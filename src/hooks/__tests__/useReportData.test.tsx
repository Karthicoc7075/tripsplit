import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useReportData } from "../useReportData";
import { DEFAULT_FILTERS, type ReportFilters } from "@/lib/reportFilters";
import type { Outing, SettlementRecord, Transaction } from "@/types";

const ME = "me";

const outing = (over: Partial<Outing> = {}): Outing => ({
  id: "goa",
  name: "Goa Trip",
  category: "Trip",
  date: "20 Aug 2026",
  status: "settled",
  startDate: "2026-08-20",
  members: [{ id: ME, name: "Karthi P" }],
  createdAt: "2026-08-20T04:00:00.000Z",
  createdById: ME,
  createdByName: "Karthi P",
  ...over,
});

const tx = (over: Partial<Transaction> = {}): Transaction => ({
  id: "t1",
  outingId: "goa",
  title: "Hotel",
  amount: 1200,
  paidById: ME,
  paidByName: "Karthi P",
  splitMode: "equally",
  splits: [{ memberId: ME, amount: 1200 }],
  date: "20 Aug 2026",
  createdAt: "2026-08-20T05:00:00.000Z",
  createdById: ME,
  createdByName: "Karthi P",
  ...over,
});

const state = {
  outings: [] as Outing[],
  transactions: [] as Transaction[],
  settlementRecords: [] as SettlementRecord[],
};

vi.mock("@/context/DataContext", () => ({
  useData: () => ({
    outings: state.outings,
    transactions: state.transactions,
    settlementRecords: state.settlementRecords,
    friends: [],
    currentUserId: ME,
    currentUserName: "Karthi P",
    loading: false,
  }),
}));

function scopeFor(filters: Partial<ReportFilters>) {
  const { result } = renderHook(() =>
    useReportData({ ...DEFAULT_FILTERS, period: "all", ...filters })
  );
  return result.current.exportScope;
}

describe("useReportData export scope", () => {
  it("drops transactions outside the selected period", () => {
    const now = new Date();
    const old = new Date(now.getFullYear() - 1, now.getMonth(), 15);
    state.outings = [outing()];
    state.transactions = [
      tx({ id: "recent", date: now.toISOString() }),
      tx({ id: "old", date: old.toISOString() }),
    ];
    state.settlementRecords = [];

    expect(scopeFor({ period: "all" }).transactions.map((t) => t.id).sort()).toEqual([
      "old",
      "recent",
    ]);
    expect(scopeFor({ period: "3m" }).transactions.map((t) => t.id)).toEqual(["recent"]);
  });

  it("includes entries with no outing while no outing filter is set", () => {
    state.outings = [outing()];
    state.transactions = [tx(), tx({ id: "orphan", outingId: "deleted" })];
    state.settlementRecords = [];

    const scope = scopeFor({});
    expect(scope.transactions.map((t) => t.id)).toContain("orphan");
    expect(scope.narrowed).toBe(false);
  });

  it("drops entries with no outing once an outing filter is set", () => {
    state.outings = [outing({ category: "Trip" })];
    state.transactions = [tx(), tx({ id: "orphan", outingId: "deleted" })];
    state.settlementRecords = [];

    const scope = scopeFor({ category: "Trip" });
    expect(scope.transactions.map((t) => t.id)).not.toContain("orphan");
    expect(scope.narrowed).toBe(true);
  });

  it("keeps only the outings the filters select", () => {
    state.outings = [
      outing({ id: "goa", name: "Goa Trip", category: "Trip" }),
      outing({ id: "dine", name: "Dinner Out", category: "Restaurant" }),
    ];
    state.transactions = [];
    state.settlementRecords = [];

    expect(scopeFor({ category: "Trip" }).outings.map((o) => o.name)).toEqual(["Goa Trip"]);
  });
});
